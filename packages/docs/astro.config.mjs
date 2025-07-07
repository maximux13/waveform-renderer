// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeBlack from "starlight-theme-black";
import tailwindcss from "@tailwindcss/vite";
import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  integrations: [
    preact(),
    starlight({
      title: "Waveform Renderer",
      description: "High-performance audio waveform visualization library for the web",
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: false,
      },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/maximux13/waveform-renderer" },
        { icon: "npm", label: "npm", href: "https://www.npmjs.com/package/waveform-renderer" },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", link: "/introduction/" },
            { label: "Installation", link: "/installation/" },
            { label: "Getting Started", link: "/getting-started/" },
            { label: "Interactive Demo", link: "/demo/" },
          ],
        },
        {
          label: "Framework Integration",
          items: [{ label: "React & Preact", link: "/react-integration/" }],
        },
        {
          label: "API Reference",
          items: [{ label: "API Overview", link: "/api/" }],
        },
        {
          label: "Advanced",
          items: [
            { label: "Advanced Rendering", link: "/advanced-rendering/" },
            { label: "Custom Renderers", link: "/custom-renderers/" },
            { label: "Render Hooks", link: "/render-hooks/" },
          ],
        },
        {
          label: "Community",
          items: [{ label: "Contributing", link: "/contributing/" }],
        },
      ],
      customCss: ["./src/styles/global.css"],
      plugins: [
        starlightThemeBlack({
          footerText: "",
        }),
      ],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
