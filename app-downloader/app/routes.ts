import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("api/downloads/stream", "routes/api.downloads.stream.ts"),
    route("api/download/:id", "routes/api.download.$id.ts"),
] satisfies RouteConfig;
