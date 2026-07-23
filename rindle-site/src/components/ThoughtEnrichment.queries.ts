// Named, bounded windows for the eight structured hashtag lanes. Each definition derives privacy
// from off-wire context; the API substitutes its verified principal before resolving the AST.

import { defineQuery, exists, isNotNull } from "@rindle/client";
import type { QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { q, relationships } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const ENRICHMENT_PAGE_SIZE = 80;
export const ENRICHMENT_MAX_LIMIT = 1_000;

const windowArgs = z.object({
  limit: z.number().int().min(ENRICHMENT_PAGE_SIZE).max(ENRICHMENT_MAX_LIMIT),
});

const publicThought = (thoughtQuery: typeof q.thought) => thoughtQuery.where.private(0);

const buildProjects = (limit: number, admin: boolean) => {
  let query = q.project;
  if (!admin) query = query.where.private(0);
  return query
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .countAs("taskCount", relationships.projectTasks, (row) => admin ? row : row.where.private(0))
    .countAs("completedCount", relationships.projectTasks, (row) =>
      (admin ? row : row.where.private(0)).where.completedAt(isNotNull()),
    )
    .sub("source", relationships.projectThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    );
};

export const thoughtProjectsQuery = defineQuery(
  "thoughtProjects",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildProjects(limit, canPublish(ctx.user)),
);

const buildTasks = (limit: number, admin: boolean) => {
  let query = q.task;
  if (!admin) query = query.where.private(0);
  return query
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .sub("source", relationships.taskThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    )
    .sub("project", relationships.taskProject, (row) =>
      (admin ? row : row.where.private(0)).select("id", "title", "status").one(),
    );
};

export const thoughtTasksQuery = defineQuery(
  "thoughtTasks",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildTasks(limit, canPublish(ctx.user)),
);

const buildQuestions = (limit: number, admin: boolean) => {
  let query = q.question;
  if (!admin) query = query.where(exists(relationships.questionThought, publicThought));
  return query
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .sub("source", relationships.questionThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    );
};

export const thoughtQuestionsQuery = defineQuery(
  "thoughtQuestions",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildQuestions(limit, canPublish(ctx.user)),
);

const buildEvents = (limit: number, admin: boolean) => {
  let query = q.event;
  if (!admin) query = query.where(exists(relationships.eventThought, publicThought));
  return query
    .orderBy("dateEpoch", "asc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .sub("source", relationships.eventThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    );
};

export const thoughtEventsQuery = defineQuery(
  "thoughtEvents",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildEvents(limit, canPublish(ctx.user)),
);

const buildLocations = (limit: number, admin: boolean) => {
  let query = q.location;
  if (!admin) query = query.where(exists(relationships.locationThought, publicThought));
  return query
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .sub("source", relationships.locationThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    );
};

export const thoughtLocationsQuery = defineQuery(
  "thoughtLocations",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildLocations(limit, canPublish(ctx.user)),
);

const buildBooks = (limit: number, admin: boolean) => {
  let query = q.book;
  if (!admin) query = query.where(exists(relationships.bookThought, publicThought));
  return query
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .sub("source", relationships.bookThought, (row) =>
      (admin ? row : row.where.private(0)).select("id", "private").one(),
    );
};

export const thoughtBooksQuery = defineQuery(
  "thoughtBooks",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildBooks(limit, canPublish(ctx.user)),
);

const buildMovies = (limit: number, admin: boolean) => {
  let query = q.movie
    .select(
      "id",
      "title",
      "normalizedTitle",
      "posterUrl",
      "year",
      "tmdbId",
      "voteAverage",
      "voteCount",
      "metadataStatus",
      "metadataProjectionVersion",
      "createdAt",
    )
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .countAs("mentionCount", relationships.movieThoughtLinks, (link) =>
      admin ? link : link.where(exists(relationships.thoughtMovieThought, publicThought)),
    );
  // Filtering via the already-materialized public mention aggregate avoids registering a second
  // relationship slot for the same link table (Rindle intentionally permits one relationship per
  // slot). `having > 0` is the privacy gate for normalized media profiles.
  if (!admin) query = query.having("mentionCount", ">", 0);
  return query
    .sub("mentions", relationships.movieThoughtLinks, (link) =>
      (admin ? link : link.where(exists(relationships.thoughtMovieThought, publicThought)))
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(20)
        .select("id", "thoughtId", "description", "createdAt"),
    );
};

export const thoughtMoviesQuery = defineQuery(
  "thoughtMovies",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildMovies(limit, canPublish(ctx.user)),
);

const buildAlbums = (limit: number, admin: boolean) => {
  let query = q.album
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .countAs("mentionCount", relationships.albumThoughtLinks, (link) =>
      admin ? link : link.where(exists(relationships.thoughtAlbumThought, publicThought)),
    );
  if (!admin) query = query.having("mentionCount", ">", 0);
  return query
    .sub("mentions", relationships.albumThoughtLinks, (link) =>
      (admin ? link : link.where(exists(relationships.thoughtAlbumThought, publicThought)))
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(20)
        .select("id", "thoughtId", "description", "createdAt"),
    );
};

export const thoughtAlbumsQuery = defineQuery(
  "thoughtAlbums",
  (raw) => windowArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => buildAlbums(limit, canPublish(ctx.user)),
);

export const thoughtEnrichmentQueries = [
  thoughtProjectsQuery,
  thoughtTasksQuery,
  thoughtQuestionsQuery,
  thoughtEventsQuery,
  thoughtLocationsQuery,
  thoughtBooksQuery,
  thoughtMoviesQuery,
  thoughtAlbumsQuery,
] as const;

export type ProjectEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtProjectsQuery>>[number];
export type TaskEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtTasksQuery>>[number];
export type QuestionEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtQuestionsQuery>>[number];
export type EventEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtEventsQuery>>[number];
export type LocationEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtLocationsQuery>>[number];
export type BookEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtBooksQuery>>[number];
export type MovieEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtMoviesQuery>>[number];
export type AlbumEnrichmentRow = QueryLocalData<ReturnType<typeof thoughtAlbumsQuery>>[number];
