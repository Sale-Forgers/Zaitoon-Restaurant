import type { MetadataRoute } from "next";

/** Lets guests add Zaitoon to their home screen (required for notifications on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zaitoon Family Restaurant",
    short_name: "Zaitoon",
    description: "Order from your table, follow your food and get offers from Zaitoon Family Restaurant.",
    start_url: "/menu",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#13110e",
    theme_color: "#13110e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
