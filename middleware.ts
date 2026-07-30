export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/posts/write", "/posts/:slug/edit"],
};
