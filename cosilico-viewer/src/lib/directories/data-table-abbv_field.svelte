<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  let { value, href = null, abbv_type = "basic" } = $props();

  // href = "/portal/root";

  const basicTruncate = (value: string, n = 24) =>
    value.length > n ? value.slice(0, n - 1) + "…" : value;

  function formatName(name) {
    const words = name.trim().split(/\s+/);

    if (words.length === 0) return "";

    if (words.length === 1) {
      const word = words[0];
      return word.length <= 20 ? word : word.slice(0, 20) + "...";
    }

    if (words.length === 2) {
      const firstInitial = words[0][0].toUpperCase() + ".";
      let second = words[1];
      if (second.length > 14) second = second.slice(0, 14) + "...";
      return `${firstInitial} ${second}`;
    }

    // For 3+ words
    const initials = words.slice(0, -1).map((w) => w[0].toUpperCase() + ".");
    const last = words[words.length - 1];

    let result = [...initials, last].join(" ");

    // Trim to max 20 characters total
    if (result.length > 20) {
      let shortened = "";
      for (let i = 0; i < initials.length; i++) {
        const test = [...initials.slice(0, i + 1), "...", last].join(" ");
        if (test.length <= 20) shortened = test;
      }
      return shortened || last.slice(0, 17) + "...";
    }

    return result;
  }

  let truncated;
  if (abbv_type == "name") {
    truncated = formatName(value);
    console.log("truncated", truncated);
  } else {
    truncated = basicTruncate(value);
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    {#if href}
      <Tooltip.Trigger>
        <a
          {href}
          class="text-black hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
        >
          {truncated}
        </a></Tooltip.Trigger
      >
    {/if}
    {#if href == null}
      <Tooltip.Trigger>{truncated}</Tooltip.Trigger>
    {/if}
    <Tooltip.Content>
      <p>{value}</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
