/// <reference types="vitest" />

import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

import packageJson from "./package.json";

const getPackageName = () => {
    return packageJson.name;
};

const getPackageNameCamelCase = () => {
    try {
        return getPackageName().replace(/-./g, char => char[1].toUpperCase());
    } catch {
        throw new Error("Name property in package.json is missing.");
    }
};

const fileName = {
    cjs: `${getPackageName()}.cjs`,
    es: `${getPackageName()}.esm.js`,
    iife: `${getPackageName()}.iife.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig({
    base: "./",
    build: {
        lib: {
            entry: path.resolve(__dirname, "src/index.ts"),
            fileName: format => fileName[format],
            formats,
            name: getPackageNameCamelCase(),
        },
        minify: "terser",
        outDir: "./dist",
        terserOptions: {
            keep_classnames: true,
            keep_fnames: true,
        },
    },
    plugins: [tailwindcss()],
    resolve: {
        alias: [
            { find: "@", replacement: path.resolve(__dirname, "src") },
            { find: "@@", replacement: path.resolve(__dirname) },
        ],
    },
    test: {
        environment: "jsdom",
        globals: true,
    },
});
