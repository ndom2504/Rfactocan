/**
 * Alias of /api/member-status — shorter path for mobile clients.
 * Keep both routes in sync (re-export handlers).
 */
export {
  runtime,
  GET,
  POST,
  DELETE,
} from "../member-status/route";
