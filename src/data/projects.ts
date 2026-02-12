// src/data/projects.ts
// Centralized project data - import this on any page that uses Layout

export interface Project {
  title: string;
  link?: string;
}

export const projects: Project[] = [
  {
    title: "Chess Engine with AI Search",
    link: "/projects/chess",
  },
  {
    title: "Hand Gesture Volume Controller",
    link: "/projects/gesture-controller",
  },
  {
    title: "Smart Shopping Assistant",
    link: "/projects/smartshop",
  },
  {
    title: "WebGL Projects",
    link: "/projects/visual",
  },
  {
    title: "Physical Shutoff Alarm App",
    link: "/projects/alarm-app",
  },
  {
    title: "Python Weather App",
    link: "/projects/weather",
  },
  {
    title: "Physically Based Raytracer",
    link: "/projects/raytracer",
  },
];

export default projects;
