/// <reference types="vitest" />

import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
    const baseConfig = {
        base: "./",
        resolve: {
            alias: [
                { find: "@", replacement: path.resolve(__dirname, "src") },
                { find: "@@", replacement: path.resolve(__dirname) },
            ],
        },
    };

    return {
        ...baseConfig,
        build: {
            emptyOutDir: true,
            minify: "esbuild",
            outDir: "../out",
            publicDir: path.resolve(__dirname, "webpage/public"),
            rollupOptions: {
                input: path.resolve(__dirname, "webpage/index.html"),
            },
        },
        plugins: [tailwindcss()],
        publicDir: path.resolve(__dirname, "webpage/public"),
        root: path.resolve(__dirname, "webpage"),
        server: {
            open: "webpage/index.html",
        },
    };
});
