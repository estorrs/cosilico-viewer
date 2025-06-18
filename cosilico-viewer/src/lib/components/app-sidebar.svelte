<script lang="ts" module>
  import AudioWaveformIcon from "@lucide/svelte/icons/audio-waveform";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import BotIcon from "@lucide/svelte/icons/bot";
  import ChartPieIcon from "@lucide/svelte/icons/chart-pie";
  import CommandIcon from "@lucide/svelte/icons/command";
  import FrameIcon from "@lucide/svelte/icons/frame";
  import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
  import MapIcon from "@lucide/svelte/icons/map";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import Folder from "@lucide/svelte/icons/folder";
  import Microscope from "@lucide/svelte/icons/microscope";

  // This is sample data.
  const data = {
    navMain: [
      {
        title: "Experiments",
        url: "#",
        icon: Microscope,
      },
      {
        title: "Documentation",
        url: "#",
        icon: BookOpenIcon,
        items: [
          {
            title: "Introduction",
            url: "#",
          },
          {
            title: "Get Started",
            url: "#",
          },
          {
            title: "Tutorials",
            url: "#",
          },
          {
            title: "Changelog",
            url: "#",
          },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2Icon,
        items: [
          {
            title: "User",
            url: "#",
          }
        ],
      },
      {
        title: "Admin",
        url: "#",
        icon: KeyRound,
        items: [
          {
            title: "User Management",
            url: "#",
          },
          {
            title: "Stats",
            url: "#",
          },
          {
            title: "Billing",
            url: "#",
          },
          {
            title: "Limits",
            url: "#",
          },
        ],
      },
    ],
    directories: [
      {
        name: "Example Directory",
        url: "#",
        icon: Folder,
      },
    ],
  };
</script>
<script lang="ts">
  import NavMain from "./nav-main.svelte";
  import NavProjects from "./nav-projects.svelte";
  import NavUser from "./nav-user.svelte";
  import TeamSwitcher from "./team-switcher.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { ComponentProps } from "svelte";
  let {
    ref = $bindable(null),
    collapsible = "icon",
    user = null,
    profile = null,
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  console.log(user);

</script>
<Sidebar.Root {collapsible} {...restProps}>
  <Sidebar.Header>
    <NavUser {user} {profile} />
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={data.navMain} />
    <NavProjects projects={data.directories} />
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>