import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("api/downloads/stream", "routes/api.downloads.stream.ts"),
] satisfies RouteConfig;
