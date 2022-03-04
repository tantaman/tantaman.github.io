Recursive data structure.

Like:

Query {
  sourceQuery: Query;
  expression: Expression;

  plan(): Plan {
    return this.sourceQuery.plan().addExpression(this.expression);
  }
}