import { Hono } from "hono";
import type { Env } from "./index";
import {
  LikeBody,
  RequestOtpBody,
  VerifyOtpBody,
  CreateCommentBody,
} from "./schemas";

export const comments = new Hono<{ Bindings: Env }>();

const OWNER_NAME = "tantaman";

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

async function getSessionCommenter(
  db: D1Database,
  authHeader: string | undefined,
): Promise<{ id: number; email: string; display_name: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT c.id, c.email, c.display_name
       FROM comment_session s
       JOIN commenter c ON c.id = s.commenter_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .bind(token, now)
    .first<{ id: number; email: string; display_name: string }>();
  return row ?? null;
}

const OWNER_COMMENTER_ID = 1; // seeded in migration 0023

function emailTag(email: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i++) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).slice(-4).padStart(4, "0");
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  text: string,
): Promise<Response> {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tantamanlands <noreply@tantaman.com>",
      to: [to],
      subject,
      text,
    }),
  });
}

// GET /comments/notifications — fetch notifications (must be before /:slug)
comments.get("/notifications", async (c) => {
  let commenterId: number;

  if (isAuthed(c)) {
    commenterId = OWNER_COMMENTER_ID;
  } else {
    const commenter = await getSessionCommenter(
      c.env.DB,
      c.req.header("Authorization"),
    );
    if (!commenter) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    commenterId = commenter.id;
  }

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM notification WHERE commenter_id = ? AND read = 0",
  )
    .bind(commenterId)
    .first<{ count: number }>();

  const rows = await c.env.DB.prepare(
    `SELECT n.id, n.comment_id, n.slug, n.read, n.created_at,
            cm.display_name AS commenter_name, cm.email AS commenter_email, co.body
     FROM notification n
     JOIN comment co ON co.id = n.comment_id
     JOIN commenter cm ON cm.id = co.commenter_id
     WHERE n.commenter_id = ? AND co.deleted_at IS NULL
     ORDER BY n.created_at DESC
     LIMIT 20`,
  )
    .bind(commenterId)
    .all();

  return c.json({
    unread_count: countRow?.count ?? 0,
    notifications: rows.results.map((r) => {
      const isOwner = r.commenter_name === OWNER_NAME;
      return {
        id: r.id,
        comment_id: r.comment_id,
        slug: r.slug,
        commenter_name: r.commenter_name,
        ...(!isOwner && r.commenter_email
          ? { commenter_tag: emailTag(r.commenter_email as string) }
          : {}),
        body: typeof r.body === "string" ? r.body.slice(0, 100) : "",
        created_at: r.created_at,
        is_read: r.read === 1,
      };
    }),
  });
});

// POST /comments/notifications/mark-read
comments.post("/notifications/mark-read", async (c) => {
  let commenterId: number;

  if (isAuthed(c)) {
    commenterId = OWNER_COMMENTER_ID;
  } else {
    const commenter = await getSessionCommenter(
      c.env.DB,
      c.req.header("Authorization"),
    );
    if (!commenter) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    commenterId = commenter.id;
  }

  await c.env.DB.prepare(
    "UPDATE notification SET read = 1 WHERE commenter_id = ? AND read = 0",
  )
    .bind(commenterId)
    .run();

  return c.json({ ok: true });
});

// GET /comments/:slug — fetch comments + like count
comments.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const visitorId = c.req.query("visitor_id");

  // Fetch comments
  const rows = await c.env.DB.prepare(
    `SELECT co.id, co.slug, co.commenter_id, co.parent_id, co.body, co.created_at, co.deleted_at,
            cm.display_name AS commenter_name, cm.email AS commenter_email
     FROM comment co
     JOIN commenter cm ON cm.id = co.commenter_id
     WHERE co.slug = ?
     ORDER BY co.created_at ASC`,
  )
    .bind(slug)
    .all();

  const commentsResult = rows.results.map((r) => {
    const isOwner = r.commenter_name === OWNER_NAME;
    return {
      id: r.id,
      slug: r.slug,
      commenter_id: r.commenter_id,
      commenter_name: r.commenter_name,
      ...(!isOwner && r.commenter_email
        ? { commenter_tag: emailTag(r.commenter_email as string) }
        : {}),
      parent_id: r.parent_id,
      body: r.deleted_at ? null : r.body,
      deleted: r.deleted_at != null,
      is_owner: isOwner,
      created_at: r.created_at,
    };
  });

  // Like count
  const likeRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM post_like WHERE slug = ?",
  )
    .bind(slug)
    .first<{ count: number }>();

  // Check if visitor has liked
  let liked = false;
  if (visitorId) {
    const likeCheck = await c.env.DB.prepare(
      "SELECT 1 FROM post_like WHERE slug = ? AND visitor_id = ?",
    )
      .bind(slug, visitorId)
      .first();
    liked = likeCheck != null;
  }

  return c.json({
    comments: commentsResult,
    like_count: likeRow?.count ?? 0,
    liked,
  });
});

// POST /comments/:slug/like — toggle like
comments.post("/:slug/like", async (c) => {
  const slug = c.req.param("slug");
  const { visitor_id } = LikeBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM post_like WHERE slug = ? AND visitor_id = ?",
  )
    .bind(slug, visitor_id)
    .first();

  if (existing) {
    await c.env.DB.prepare(
      "DELETE FROM post_like WHERE slug = ? AND visitor_id = ?",
    )
      .bind(slug, visitor_id)
      .run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO post_like (slug, visitor_id, created_at) VALUES (?, ?, ?)",
    )
      .bind(slug, visitor_id, now)
      .run();
  }

  const likeRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM post_like WHERE slug = ?",
  )
    .bind(slug)
    .first<{ count: number }>();

  return c.json({
    liked: !existing,
    like_count: likeRow?.count ?? 0,
  });
});

// POST /comments/:slug — create comment (requires session or THOUGHT_SECRET)
comments.post("/:slug", async (c) => {
  const slug = c.req.param("slug");

  let commenterId: number;
  let commenterName: string;
  let commenterEmail: string | null = null;
  let ownerComment = false;

  // Admin (site owner) can comment directly with THOUGHT_SECRET
  if (isAuthed(c)) {
    commenterId = OWNER_COMMENTER_ID;
    commenterName = OWNER_NAME;
    ownerComment = true;
  } else {
    const commenter = await getSessionCommenter(
      c.env.DB,
      c.req.header("Authorization"),
    );
    if (!commenter) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    commenterId = commenter.id;
    commenterName = commenter.display_name;
    commenterEmail = commenter.email;
  }

  const { body, parent_id } = CreateCommentBody.parse(await c.req.json());

  // Validate parent_id if present
  if (parent_id != null) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM comment WHERE id = ? AND slug = ?",
    )
      .bind(parent_id, slug)
      .first();
    if (!parent) {
      return c.json({ error: "Parent comment not found" }, 404);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    "INSERT INTO comment (slug, commenter_id, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(slug, commenterId, parent_id ?? null, body, now)
    .run();

  const newCommentId = result.meta.last_row_id;
  const notifiedIds = new Set<number>();

  // Notify parent comment author on reply
  if (parent_id != null) {
    const parentComment = await c.env.DB.prepare(
      "SELECT commenter_id FROM comment WHERE id = ?",
    )
      .bind(parent_id)
      .first<{ commenter_id: number }>();
    if (parentComment && parentComment.commenter_id !== commenterId) {
      await c.env.DB.prepare(
        "INSERT INTO notification (commenter_id, comment_id, slug, created_at) VALUES (?, ?, ?, ?)",
      )
        .bind(parentComment.commenter_id, newCommentId, slug, now)
        .run();
      notifiedIds.add(parentComment.commenter_id);

      // Email the parent commenter (but not the site owner — they check directly)
      if (parentComment.commenter_id !== OWNER_COMMENTER_ID) {
        const recipient = await c.env.DB.prepare(
          "SELECT email FROM commenter WHERE id = ?",
        )
          .bind(parentComment.commenter_id)
          .first<{ email: string }>();
        if (recipient) {
          const bodyPreview = body.length > 200 ? body.slice(0, 200) + "…" : body;
          c.executionCtx.waitUntil(
            sendEmail(
              c.env.RESEND_API_KEY,
              recipient.email,
              "Someone replied to your comment on Tantamanlands",
              `${commenterName} replied to your comment on ${slug}:\n\n${bodyPreview}\n\nView: https://tantaman.com/${slug}`,
            ),
          );
        }
      }
    }
  }

  // Notify owner of all comments by others
  if (commenterId !== OWNER_COMMENTER_ID && !notifiedIds.has(OWNER_COMMENTER_ID)) {
    await c.env.DB.prepare(
      "INSERT INTO notification (commenter_id, comment_id, slug, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(OWNER_COMMENTER_ID, newCommentId, slug, now)
      .run();
  }

  return c.json(
    {
      id: result.meta.last_row_id,
      slug,
      commenter_id: commenterId,
      commenter_name: commenterName,
      ...(!ownerComment && commenterEmail
        ? { commenter_tag: emailTag(commenterEmail) }
        : {}),
      parent_id: parent_id ?? null,
      body,
      deleted: false,
      is_owner: ownerComment,
      created_at: now,
    },
    201,
  );
});

// DELETE /comments/:slug/:id — soft-delete comment
comments.delete("/:slug/:id", async (c) => {
  const slug = c.req.param("slug");
  const id = parseInt(c.req.param("id"), 10);
  const now = Math.floor(Date.now() / 1000);

  // Admin can delete any
  if (isAuthed(c)) {
    const result = await c.env.DB.prepare(
      "UPDATE comment SET deleted_at = ? WHERE id = ? AND slug = ? AND deleted_at IS NULL",
    )
      .bind(now, id, slug)
      .run();
    if (result.meta.changes === 0) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ deleted: true });
  }

  // Commenter can delete own
  const commenter = await getSessionCommenter(
    c.env.DB,
    c.req.header("Authorization"),
  );
  if (!commenter) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await c.env.DB.prepare(
    "UPDATE comment SET deleted_at = ? WHERE id = ? AND slug = ? AND commenter_id = ? AND deleted_at IS NULL",
  )
    .bind(now, id, slug, commenter.id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found or not yours" }, 404);
  }

  return c.json({ deleted: true });
});

// POST /comments/auth/request-otp — send OTP email
comments.post("/auth/request-otp", async (c) => {
  const { email } = RequestOtpBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  // Rate limit: 1 OTP per email per 5 minutes
  const recent = await c.env.DB.prepare(
    "SELECT id FROM otp WHERE email = ? AND created_at > ?",
  )
    .bind(email, now - 300)
    .first();

  if (recent) {
    return c.json({ error: "Please wait before requesting another code" }, 429);
  }

  const code = generateOtp();
  const expiresAt = now + 600; // 10 minutes

  await c.env.DB.prepare(
    "INSERT INTO otp (email, code, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(email, code, expiresAt, now)
    .run();

  // Send via Resend
  const resendRes = await sendEmail(
    c.env.RESEND_API_KEY,
    email,
    "Your comment verification code",
    `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
  );

  if (!resendRes.ok) {
    console.error("Resend error:", await resendRes.text());
    return c.json({ error: "Failed to send email" }, 500);
  }

  return c.json({ sent: true });
});

// POST /comments/auth/verify-otp — verify OTP, return session token
comments.post("/auth/verify-otp", async (c) => {
  const { email, code, display_name } = VerifyOtpBody.parse(
    await c.req.json(),
  );
  const now = Math.floor(Date.now() / 1000);

  const otp = await c.env.DB.prepare(
    "SELECT id FROM otp WHERE email = ? AND code = ? AND expires_at > ? AND used = 0",
  )
    .bind(email, code, now)
    .first<{ id: number }>();

  if (!otp) {
    return c.json({ error: "Invalid or expired code" }, 400);
  }

  // Reserve owner name
  const requestedName = display_name?.trim().toLowerCase();
  if (requestedName === OWNER_NAME) {
    return c.json({ error: "That display name is reserved" }, 400);
  }

  // Mark OTP as used
  await c.env.DB.prepare("UPDATE otp SET used = 1 WHERE id = ?")
    .bind(otp.id)
    .run();

  // Upsert commenter
  const existingCommenter = await c.env.DB.prepare(
    "SELECT id, display_name FROM commenter WHERE email = ?",
  )
    .bind(email)
    .first<{ id: number; display_name: string }>();

  let commenterId: number;
  let commenterName: string;

  if (existingCommenter) {
    commenterId = existingCommenter.id;
    commenterName = existingCommenter.display_name;
  } else {
    const name = display_name || email.split("@")[0];
    if (name.toLowerCase() === OWNER_NAME) {
      return c.json({ error: "That display name is reserved" }, 400);
    }
    const result = await c.env.DB.prepare(
      "INSERT INTO commenter (email, display_name, created_at) VALUES (?, ?, ?)",
    )
      .bind(email, name, now)
      .run();
    commenterId = result.meta.last_row_id as number;
    commenterName = name;
  }

  // Create session (30-day expiry)
  const token = generateToken();
  const expiresAt = now + 30 * 24 * 60 * 60;
  await c.env.DB.prepare(
    "INSERT INTO comment_session (token, commenter_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(token, commenterId, expiresAt, now)
    .run();

  return c.json({
    token,
    commenter: {
      id: commenterId,
      display_name: commenterName,
      email,
      tag: emailTag(email),
    },
  });
});

// GET /comments/auth/me — check session validity
comments.get("/auth/me", async (c) => {
  // Admin auth via THOUGHT_SECRET
  if (isAuthed(c)) {
    return c.json({
      commenter: {
        id: OWNER_COMMENTER_ID,
        display_name: OWNER_NAME,
        email: "owner@tantaman.com",
        is_owner: true,
      },
    });
  }

  const commenter = await getSessionCommenter(
    c.env.DB,
    c.req.header("Authorization"),
  );
  if (!commenter) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  return c.json({
    commenter: {
      id: commenter.id,
      display_name: commenter.display_name,
      email: commenter.email,
      is_owner: false,
      tag: emailTag(commenter.email),
    },
  });
});
