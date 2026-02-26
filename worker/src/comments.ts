import { Hono } from "hono";
import type { Env } from "./index";
import {
  LikeBody,
  RequestOtpBody,
  VerifyOtpBody,
  CreateCommentBody,
} from "./schemas";

export const comments = new Hono<{ Bindings: Env }>();

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

// GET /comments/:slug — fetch comments + like count
comments.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const visitorId = c.req.query("visitor_id");

  // Fetch comments
  const rows = await c.env.DB.prepare(
    `SELECT co.id, co.slug, co.commenter_id, co.parent_id, co.body, co.created_at, co.deleted_at,
            cm.display_name AS commenter_name
     FROM comment co
     JOIN commenter cm ON cm.id = co.commenter_id
     WHERE co.slug = ?
     ORDER BY co.created_at ASC`,
  )
    .bind(slug)
    .all();

  const commentsResult = rows.results.map((r) => ({
    id: r.id,
    slug: r.slug,
    commenter_id: r.commenter_id,
    commenter_name: r.commenter_name,
    parent_id: r.parent_id,
    body: r.deleted_at ? null : r.body,
    deleted: r.deleted_at != null,
    created_at: r.created_at,
  }));

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

// POST /comments/:slug — create comment (requires session)
comments.post("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const commenter = await getSessionCommenter(
    c.env.DB,
    c.req.header("Authorization"),
  );
  if (!commenter) {
    return c.json({ error: "Unauthorized" }, 401);
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
    .bind(slug, commenter.id, parent_id ?? null, body, now)
    .run();

  return c.json(
    {
      id: result.meta.last_row_id,
      slug,
      commenter_id: commenter.id,
      commenter_name: commenter.display_name,
      parent_id: parent_id ?? null,
      body,
      deleted: false,
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
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tantamanlands <noreply@tantaman.com>",
      to: [email],
      subject: "Your comment verification code",
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    }),
  });

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
    if (display_name && display_name !== existingCommenter.display_name) {
      await c.env.DB.prepare(
        "UPDATE commenter SET display_name = ? WHERE id = ?",
      )
        .bind(display_name, commenterId)
        .run();
      commenterName = display_name;
    }
  } else {
    const name = display_name || email.split("@")[0];
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
    },
  });
});

// GET /comments/auth/me — check session validity
comments.get("/auth/me", async (c) => {
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
    },
  });
});
