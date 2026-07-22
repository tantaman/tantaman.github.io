-- Feed subscriptions should not ship every full paste body. The authoring callsite derives this
-- bounded plain-text preview from the same body and supplies it to the replay-safe create mutator.
ALTER TABLE paste ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
