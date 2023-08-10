// the following is a schema definition for querying our books database
export interface QueryResponse {
  book?: string; // anything general about the book description or title should be put in this field

  subjects?:
    | (
        | "Science fiction"
        | "Fantasy"
        | "Fiction"
        | "Nonfiction" // sometimes this is called "non-fiction" or "non fiction" by the user
        | "Hugo Award Winner"
        | "Pirates"
        | "New York Times bestseller"
        | "Wizards"
        | "hard science-fiction"
      )[]
    | null; // Please normalize similar strings to these three if the user requests this

  // if the query has something like top rated make it = 5
  starsCondition?: {
    op: "$lt" | "$lte" | "$gt" | "$gte" | "$eq"; // these are less than, less than or equal, greater than, greater than or equal, equals respectively
    value: 1 | 2 | 3 | 4 | 5;
  } | null;
}
