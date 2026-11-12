/**
 * One implementation, two runtimes: the identity function and the test suite
 * both import this file, so a matching rule can never be true in the browser
 * and false on the server.
 */
export * from "../../supabase/functions/_shared/name-match";
