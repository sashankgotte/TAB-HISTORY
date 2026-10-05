(() => {
  "use strict";

  const categoryOrder = ["birds", "animals", "trees", "plants"];
  const categoryNames = Object.fromEntries(categoryOrder.map(key => [key, SPECIES_DATA[key].label]));
  const categoryFallbacks = Object.fromEntries(categoryOrder.map(key => [key, `https://images.unsplash.com/${SPECIES_DATA[key].image}?auto=format&fit=crop&w=900&q=80`]));
  const continentOptions = ["Asia", "Africa", "Europe", "North America", "South America", "Australia", "Antarctica"];
  const habitatOptions = ["Forest", "Desert", "Ocean", "Grassland", "Mountains", "Wetlands", "Arctic", "Tropical"];
  const threatened = new Set(["Tiger", "Lion", "Elephant", "Giraffe", "Zebra", "Gorilla", "Chimpanzee", "Panda", "Cheetah", "Rhinoceros", "Whale", "Dolphin", "Komodo Dragon", "Sea Turtle", "Polar Bear", "Sea Otter", "Kiwi", "Albatross", "Redwood", "Giant Sequoia", "Banyan Tree", "Baobab"]);
  const conservationNotes = {
    Tiger: "Endangered", "Giant Sequoia": "Endangered",
    Gorilla: "Endangered (species vary)", "Komodo Dragon": "Endangered",
    Panda: "Vulnerable", "Polar Bear": "Vulnerable", Cheetah: "Vulnerable",
    "Sea Otter": "Varies by population", Kiwi: "Threatened (species vary)",
    Albatross: "Threatened (species vary)", Macaw: "Varies by species",
    Rhinoceros: "Threatened (species vary)", "African Elephant": "Endangered"
  };
  const imageCache = new Map();
  const pendingImages = new Set();
  const imageQueue = [];
  const allSpecies = [];
  let activePage = "home";
  let selectedCategory = "";
  let currentQuery = "";
  let currentQuiz = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let activeImageRequests = 0;

  const byId = id => document.getElementById(id);
  const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const clean = value => String(value ?? "").trim();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function statusFor(name) {
    if (conservationNotes[name]) return conservationNotes[name];
    if (threatened.has(name)) return "Some species at risk; status varies";
    return "Varies by species; check current assessment";
  }

  function buildSpecies() {
    for (const key of categoryOrder) {
      SPECIES_DATA[key].items.forEach((row, index) => {
        let item;
        if (key === "trees") {
          item = {
            name: row[0], scientific: row[1], origin: row[2], habitat: row[3], height: row[4], lifespan: row[5],
            uses: row[6], fact: row[7], region: row[2], diet: "Makes its own food using sunlight",
            history: `${row[0]} originated in ${row[2]} and has grown alongside local landscapes and communities. Over time, people have relied on it for ${row[6].toLowerCase()}. Today it also helps store carbon and support wildlife.`,
            conservation: statusFor(row[0]), environment: `Provides shelter and food for wildlife, stores carbon, and helps keep its local ecosystem healthy.`
          };
        } else if (key === "plants") {
          item = {
            name: row[0], scientific: row[1], origin: row[2], region: row[2], habitat: row[3], uses: row[4],
            lifespan: row[5], fact: row[6], diet: "Makes its own food using sunlight",
            history: `${row[0]} has its origins in ${row[2]}. People have grown, gathered, or admired it over generations. Its story shows how plants shape food, culture, habitats, and everyday life.`,
            conservation: statusFor(row[0]),
            importance: /food|crop|tea|coffee|fibre|fiber|agricultural/i.test(row[4])
              ? `An important crop or useful plant for people; its cultivation supports food, materials, and livelihoods.`
              : `Valued for ${row[4].toLowerCase()}; like other plants, it supports pollinators and contributes to healthy ecosystems.`
          };
        } else {
          item = {
            name: row[0], scientific: row[1], region: row[2], habitat: row[3], diet: row[4], lifespan: row[5],
            fact: row[6], origin: row[2], history: `${row[0]} evolved over many generations to thrive in ${row[3].toLowerCase()} habitats. People have encountered this species through local wildlife, culture, food, or conservation. Its future depends on healthy habitats and responsible care of the natural world.`,
            conservation: statusFor(row[0])
          };
          if (key === "animals") {
            item.size = animalSizes[row[0]] || "Varies by species";
            item.evolution = `${row[0]} is adapted to life in ${row[3].toLowerCase()}. Its body, senses, and behaviour developed over many generations as the species responded to its environment.`;
          } else {
            item.commonName = commonBirdNames[row[0]] || row[0];
            item.history = `${row[0]} evolved with adaptations that help it find food and thrive in ${row[3].toLowerCase()} habitats. Birds share ancient dinosaur ancestry; people have long observed, celebrated, and studied them. Protecting nesting places and migration routes helps their future.`;
          }
        }
        allSpecies.push({
          id: `${key}-${slug(row[0])}-${index}`, category: key, categoryLabel: categoryNames[key],
          ...item, image: categoryFallbacks[key], searchText: ""
        });
      });
    }
    allSpecies.forEach(species => {
      species.searchText = [
        species.name, species.scientific, species.commonName, species.origin, species.region,
        species.habitat, species.diet, species.categoryLabel
      ].filter(Boolean).join(" ").toLowerCase();
    });
  }

  const commonBirdNames = {
    Eagle: "Golden eagle (representative species)", Parrot: "Parrots", Peacock: "Indian peafowl",
    Penguin: "Penguins", Owl: "Owls", Sparrow: "House sparrow", Flamingo: "Greater flamingo",
    Ostrich: "Common ostrich", Crow: "Crows", Kingfisher: "Common kingfisher", Hummingbird: "Hummingbirds",
    Toucan: "Toco toucan (representative species)", Swan: "Mute swan (representative species)",
    Crane: "Cranes", Albatross: "Wandering albatross (representative species)",
    Falcon: "Peregrine falcon (representative species)", Pelican: "Brown pelican (representative species)",
    Woodpecker: "Woodpeckers", Macaw: "Scarlet macaw (representative species)", Emu: "Common emu",
    Kiwi: "North Island brown kiwi (representative species)", Pigeon: "Rock pigeon", Turkey: "Wild turkey"
  };
  const animalSizes = {
    Lion: "About 1.4–2.5 m body length", Tiger: "About 1.4–3.3 m body length",
    Elephant: "Up to 4 m tall at the shoulder", Giraffe: "Up to 5.7 m tall",
    Zebra: "About 2–2.7 m body length", Bear: "Varies greatly by species",
    Wolf: "About 1–1.6 m body length", Fox: "About 0.5–1 m body length",
    Deer: "Varies by species", Horse: "About 1.4–1.8 m at the shoulder",
    Dog: "Varies greatly by breed", Cat: "About 46 cm body length",
    Gorilla: "Up to 1.8 m standing height", Chimpanzee: "About 1–1.7 m standing height",
    Kangaroo: "Up to 2 m tall", Panda: "About 1.2–1.9 m body length",
    Cheetah: "About 1.1–1.5 m body length", Leopard: "About 0.9–1.9 m body length",
    Rhinoceros: "Up to 1.8 m tall at the shoulder", Hippopotamus: "Up to 5 m body length",
    Camel: "About 1.8–2.1 m at the shoulder", Koala: "About 60–85 cm",
    Sloth: "About 50–75 cm", Whale: "Varies by species; up to 30 m",
    Dolphin: "Varies by species; about 1.5–4 m", Crocodile: "Varies; some exceed 6 m",
    Alligator: "Up to about 4.5 m", Snake: "Varies by species", Turtle: "Varies by species",
    Tortoise: "Varies by species", Chameleon: "Varies by species", "Komodo Dragon": "Up to 3 m",
    Frog: "Varies by species", Toad: "Varies by species", Salamander: "Varies by species",
    Shark: "Varies by species; up to 12 m", Octopus: "Varies by species",
    Jellyfish: "Varies by species", Seahorse: "About 2–35 cm", Starfish: "Varies by species",
    "Polar Bear": "Up to 3 m standing height", "Sea Otter": "About 1–1.5 m",
    Platypus: "About 43–60 cm"
  };

  function fallbackSvg(category) {
    const emoji = SPECIES_DATA[category].emoji;
    const label = `${categoryNames[category]} photo`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#e8eee0"/><circle cx="650" cy="105" r="100" fill="#d9e7c6"/><path d="M0 370Q180 260 355 360T800 310V500H0Z" fill="#c7d8b8"/><text x="400" y="270" text-anchor="middle" font-size="115">${emoji}</text><text x="400" y="430" text-anchor="middle" fill="#55704e" font-family="Arial,sans-serif" font-size="23">${label}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function watchImages(scope = document) {
    const images = [...scope.querySelectorAll("img[data-species-image]")];
    for (const image of images) {
      image.onerror = () => {
        image.onerror = null;
        image.src = fallbackSvg(image.dataset.category);
      };
      image.src = categoryFallbacks[image.dataset.category];
      const name = image.dataset.species;
      const cached = imageCache.get(name);
      if (cached) image.src = cached;
    }
    if (!("IntersectionObserver" in window)) {
      images.forEach(queueWikiImage);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          queueWikiImage(entry.target);
        }
      });
    }, { rootMargin: "180px" });
    images.forEach(image => {
      if (!imageCache.has(image.dataset.species)) observer.observe(image);
    });
  }

  function queueWikiImage(image) {
    const name = image.dataset.species;
    if (pendingImages.has(name)) return;
    if (imageCache.has(name)) {
      image.src = imageCache.get(name);
      return;
    }
    pendingImages.add(name);
    imageQueue.push(image);
    processImageQueue();
  }

  function processImageQueue() {
    while (activeImageRequests < 3 && imageQueue.length) {
      const image = imageQueue.shift();
      const name = image.dataset.species;
      activeImageRequests += 1;
      fetchSpeciesImage(image, name).finally(() => {
        pendingImages.delete(name);
        activeImageRequests -= 1;
        processImageQueue();
      });
    }
  }

  async function fetchSpeciesImage(image, name) {
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`);
      if (!response.ok) throw new Error(`Image lookup failed for ${name}: ${response.status}`);
      const data = await response.json();
      const thumbnail = data.thumbnail?.source || data.originalimage?.source;
      const resolvedImage = thumbnail || image.src;
      imageCache.set(name, resolvedImage);
      document.querySelectorAll(`img[data-species="${CSS.escape(name)}"]`).forEach(element => { element.src = resolvedImage; });
    } catch (error) {
      imageCache.set(name, image.src);
      console.info(`Using the built-in image fallback for ${name}.`, error);
    }
  }

  function createCategoryCards() {
    const descriptions = {
      birds: "Feathered wonders, from tiny hummers to far-flying albatrosses.",
      animals: "Meet the fascinating lives that roam land, sea, and sky.",
      trees: "Discover the roots, canopies, and stories of trees worldwide.",
      plants: "Flowers, food, and remarkable plants from every corner of Earth."
    };
    byId("category-grid").innerHTML = categoryOrder.map(key => `
      <article class="category-card">
        <a href="#${key}" class="category-explore" data-category="${key}" aria-label="Explore ${categoryNames[key]}">
          <div class="category-image"><img data-species-image data-species="${escapeHtml(SPECIES_DATA[key].items[0][0])}" data-category="${key}" alt="${escapeHtml(categoryNames[key])} in nature" loading="lazy"><span class="category-icon">${SPECIES_DATA[key].emoji}</span></div>
          <div class="category-copy"><h3>${escapeHtml(categoryNames[key].toUpperCase())}</h3><p>${escapeHtml(descriptions[key])}</p><span class="category-link">Explore ${categoryNames[key].toLowerCase()} <span>→</span></span></div>
        </a>
      </article>`).join("");
    watchImages(byId("category-grid"));
  }

  function setPage(page, category = "", query = "") {
    activePage = page;
    selectedCategory = category;
    currentQuery = query;
    document.querySelectorAll(".page-section").forEach(section => section.classList.add("hidden"));
    const targetPage = page === "catalog" ? "catalog-page" : `${page}-page`;
    byId(targetPage)?.classList.remove("hidden");
    document.querySelectorAll(".nav-link").forEach(link => {
      link.classList.toggle("active", link.dataset.page === (page === "catalog" ? category : page));
    });
    byId("main-nav").classList.remove("open");
    byId("mobile-menu").setAttribute("aria-expanded", "false");
    byId("mobile-menu").setAttribute("aria-label", "Open navigation");
    byId("mobile-menu").textContent = "☰";
    if (page === "catalog") {
      byId("catalog-search-input").value = query;
      byId("category-filter").value = category;
      renderCatalog();
    }
    if (page === "history") renderHistory();
    if (page === "quiz") initializeQuizPage();
    if (location.hash !== `#${page === "catalog" ? (category || "explore") : page}`) {
      history.replaceState(null, "", `#${page === "catalog" ? (category || "explore") : page}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function populateFilters() {
    byId("category-filter").innerHTML = `<option value="">All categories</option>${categoryOrder.map(key => `<option value="${key}">${categoryNames[key]}</option>`).join("")}`;
    byId("continent-filter").innerHTML += continentOptions.map(item => `<option value="${item}">${item}</option>`).join("");
    byId("habitat-filter").innerHTML += habitatOptions.map(item => `<option value="${item}">${item}</option>`).join("");
  }

  function hasContinent(species, continent) {
    const text = `${species.region} ${species.origin}`.toLowerCase();
    const matchers = {
      "Asia": ["asia", "asian", "south asia", "east asia", "southeast asia", "central asia", "himalaya"],
      "Africa": ["africa", "african", "madagascar"],
      "Europe": ["europe", "european", "mediterranean"],
      "North America": ["north america", "united states", "california", "carolina", "canada", "arctic"],
      "South America": ["south america", "amazon", "andes", "central america", "caribbean"],
      "Australia": ["australia", "oceania", "new zealand"],
      "Antarctica": ["antarctica", "southern ocean"]
    };
    if (matchers[continent]?.some(value => text.includes(value))) return true;
    if (/worldwide|all continents|all oceans/i.test(text)) {
      return continent !== "Antarctica" || /antarctica/i.test(text);
    }
    const regionMap = {
      "Asia": ["Europe, Asia", "Asia, Europe", "Africa, Asia", "Asia, Africa", "Asia, Australia", "Asia, the Americas"],
      "Africa": ["Africa, Asia", "Asia, Africa", "Africa, Madagascar"],
      "Europe": ["Europe, Asia", "Asia, Europe", "Europe, Africa"],
      "North America": ["North America, Europe", "North America, Asia", "North America, South America"],
      "South America": ["South America, Central America", "South America, Africa", "North America, South America"],
      "Australia": ["Africa, Asia, Australia", "Asia, Australia"]
    };
    return (regionMap[continent] || []).some(pair => text.includes(pair.toLowerCase()));
  }

  function hasHabitat(species, habitat) {
    const text = `${species.habitat} ${species.region} ${species.origin}`.toLowerCase();
    const matchers = {
      Forest: ["forest", "woodland", "tree", "bamboo", "rainforest", "wood", "mountain forest"],
      Desert: ["desert", "arid", "dry region", "dry garden"],
      Ocean: ["ocean", "coast", "marine", "sea", "coral reef", "north pacific", "southern ocean"],
      Grassland: ["grassland", "savanna", "meadow", "prairie", "farmland", "farm", "steppe", "grass", "pasture", "temperate regions"],
      Mountains: ["mountain", "highland", "himalaya", "cliff", "slope", "highlands"],
      Wetlands: ["wetland", "river", "lake", "pond", "freshwater", "bog", "marsh", "wet soil", "swamp", "moist soil"],
      Arctic: ["arctic", "tundra", "polar", "ice"],
      Tropical: ["tropical", "rainforest", "tropics", "subtropical"]
    };
    return matchers[habitat]?.some(value => text.includes(value)) || false;
  }

  function renderCatalog() {
    const category = byId("category-filter").value;
    selectedCategory = category;
    const query = clean(byId("catalog-search-input").value).toLowerCase();
    const continent = byId("continent-filter").value;
    const habitat = byId("habitat-filter").value;
    currentQuery = query;
    const group = category ? SPECIES_DATA[category] : null;
    byId("catalog-kicker").textContent = group ? `${group.emoji}  THE ${group.label.toUpperCase()} FIELD GUIDE` : "✳  THE WORLD OF NATURE";
    byId("catalog-title").textContent = group ? group.title : "A world of nature to explore.";
    byId("catalog-description").textContent = group ? group.description : "Search across birds, animals, trees and plants. Every discovery has a story.";
    const results = allSpecies.filter(species =>
      (!category || species.category === category) &&
      (!query || species.searchText.includes(query)) &&
      (!continent || hasContinent(species, continent)) &&
      (!habitat || hasHabitat(species, habitat))
    ).sort((a, b) => {
      if (query && a.name.toLowerCase().startsWith(query)) return -1;
      if (query && b.name.toLowerCase().startsWith(query)) return 1;
      return a.name.localeCompare(b.name);
    });
    byId("result-count").textContent = `${results.length} ${results.length === 1 ? "discovery" : "discoveries"}`;
    const cardComponents = { birds: BirdCard, animals: AnimalCard, trees: TreeCard, plants: PlantCard };
    byId("species-grid").innerHTML = results.map(species => cardComponents[species.category](species)).join("");
    byId("empty-state").classList.toggle("hidden", results.length > 0);
    byId("species-grid").classList.toggle("hidden", results.length === 0);
    watchImages(byId("species-grid"));
  }

  function SpeciesCard(species) {
    return `
      <article class="species-card" tabindex="0" role="button" data-open-species="${species.id}" aria-label="Learn about ${escapeHtml(species.name)}">
        <div class="species-photo"><img data-species-image data-species="${escapeHtml(species.name)}" data-category="${species.category}" alt="${escapeHtml(species.name)} in its natural habitat" loading="lazy"><span class="species-category">${SPECIES_DATA[species.category].emoji} ${escapeHtml(species.categoryLabel)}</span></div>
        <div class="species-card-copy"><h3>${escapeHtml(species.name)}</h3><p class="scientific">${escapeHtml(species.scientific)}</p>
          <div class="card-detail-row"><span>${species.category === "trees" ? "Origin" : "Habitat"}</span><strong>${escapeHtml(species.category === "trees" ? species.origin : species.habitat)}</strong></div>
          <div class="card-learn"><span>Discover its story</span><span aria-hidden="true">↗</span></div>
        </div>
      </article>`;
  }

  function BirdCard(species) { return SpeciesCard(species); }
  function AnimalCard(species) { return SpeciesCard(species); }
  function TreeCard(species) { return SpeciesCard(species); }
  function PlantCard(species) { return SpeciesCard(species); }

  function speciesById(id) {
    return allSpecies.find(item => item.id === id);
  }

  function openSpecies(species) {
    if (!species) return;
    byId("species-details").innerHTML = SpeciesDetails(species);
    watchImages(byId("species-details"));
    byId("species-dialog").showModal();
  }

  function SpeciesDetails(species) {
    const facts = species.category === "birds" ? [
      ["Common name", species.commonName], ["Region / habitat", `${species.region} · ${species.habitat}`],
      ["Diet", species.diet], ["Lifespan", species.lifespan], ["Conservation status", species.conservation],
      ["Interesting fact", species.fact]
    ] : species.category === "animals" ? [
      ["Habitat", species.habitat], ["Location / continent", species.region], ["Diet", species.diet],
      ["Lifespan", species.lifespan], ["Size", species.size], ["Conservation status", species.conservation],
      ["Interesting fact", species.fact]
    ] : species.category === "trees" ? [
      ["Origin", species.origin], ["Where it grows", species.habitat], ["Average height", species.height],
      ["Lifespan", species.lifespan], ["Uses", species.uses], ["Environmental importance", species.environment],
      ["Interesting fact", species.fact]
    ] : [
      ["Origin", species.origin], ["Habitat", species.habitat], ["Uses", species.uses],
      ["Lifespan", species.lifespan], ["Medicinal / agricultural importance", species.importance], ["Interesting fact", species.fact]
    ];
    const status = species.category === "plants" || species.category === "trees"
      ? `<div class="detail-fact"><strong>Conservation note</strong><p>Conservation status varies by species and region; consult local assessments.</p></div>` : "";
    return `
      <img class="detail-image" data-species-image data-species="${escapeHtml(species.name)}" data-category="${species.category}" alt="${escapeHtml(species.name)} in its natural habitat">
      <div class="detail-content"><div class="detail-heading"><div><span class="eyebrow">${SPECIES_DATA[species.category].emoji} ${escapeHtml(species.categoryLabel)} FIELD NOTES</span><h2 id="dialog-name">${escapeHtml(species.name)}</h2><p class="scientific">${escapeHtml(species.scientific)}</p></div><span class="detail-badge">${escapeHtml(species.conservation)}</span></div>
        <div class="detail-facts">${facts.map(([label, value]) => `<div class="detail-fact"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(value)}</p></div>`).join("")}${status}</div>
        <div class="detail-story"><strong>✳ A little history</strong><p>${escapeHtml(species.history)}</p>${species.evolution ? `<p><strong>Evolution:</strong> ${escapeHtml(species.evolution)}</p>` : ""}</div>
      </div>`;
  }

  function allFacts() {
    return allSpecies.map(species => `${species.name}: ${species.fact}`);
  }

  function factOfTheDay() {
    const now = new Date();
    const seed = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    return allFacts()[seed % allSpecies.length];
  }

  function showRandomFact() {
    const facts = allFacts();
    const next = facts[Math.floor(Math.random() * facts.length)];
    byId("fact-of-the-day").textContent = next;
  }

  function getDailySpecies() {
    const today = new Date();
    const seed = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
    return allSpecies[seed % allSpecies.length];
  }

  function renderDaily() {
    const species = getDailySpecies();
    byId("daily-card").innerHTML = `
      <img data-species-image data-species="${escapeHtml(species.name)}" data-category="${species.category}" alt="${escapeHtml(species.name)} in its natural habitat" loading="lazy">
      <div class="daily-info"><span class="eyebrow">✳ ${escapeHtml(species.categoryLabel)} SPOTLIGHT</span><h3>${escapeHtml(species.name)}</h3><p class="scientific">${escapeHtml(species.scientific)}</p><p class="daily-fact">${escapeHtml(species.fact)}</p><span class="daily-open">Open field notes ↗</span></div>`;
    watchImages(byId("daily-card"));
  }

  function HistorySection() {
    const entries = [
      ["A very old beginning", "Life on Earth has changed over billions of years. Today's birds, mammals and plants are part of branches on a vast, interconnected tree of life."],
      ["Life adapts", "Over many generations, species develop features and behaviours that help them survive in their habitats. Evolution is a gradual story written across time."],
      ["Plants and people", "People have cultivated crops such as wheat and rice for thousands of years. Plants also provide materials, shade, medicine traditions and cultural meaning."],
      ["A shared world", "Animals have lived alongside people as companions, helpers, sources of inspiration and wild neighbours. Human choices can make habitats safer or more difficult."],
      ["Changing habitats", "Climate, land use and other environmental changes affect where species can live. Healthy forests, wetlands, grasslands and oceans help life thrive."],
      ["The story continues", "Conservation, careful stewardship and learning from evidence can help species and ecosystems recover. Every generation can shape what happens next."]
    ];
    return entries.map(([title, text], index) => `
      <article class="history-card"><span>0${index + 1} / FIELD NOTE</span><h3>${title}</h3><p>${text}</p></article>`).join("");
  }

  function renderHistory() { byId("history-grid").innerHTML = HistorySection(); }

  const questions = [
    { q: "Which is the largest land animal alive today?", options: ["African elephant", "Giraffe", "Hippopotamus", "Rhinoceros"], answer: 0, explanation: "African elephants are the largest land animals alive today." },
    { q: "Which bird is famous for hovering and flying backwards?", options: ["Albatross", "Hummingbird", "Ostrich", "Swan"], answer: 1, explanation: "Hummingbirds' flexible wings let them hover and fly backwards." },
    { q: "What is a banana plant, botanically speaking?", options: "A tree|A giant herb|A shrub|A vine".split("|"), answer: 1, explanation: "The banana plant is a giant herb, not a tree." },
    { q: "Which animal has three hearts and blue blood?", options: ["Dolphin", "Seahorse", "Octopus", "Shark"], answer: 2, explanation: "An octopus has three hearts and copper-rich blue blood." },
    { q: "What do ferns use to reproduce?", options: ["Cones", "Spores", "Bulbs", "Pinecones"], answer: 1, explanation: "Ferns reproduce using spores instead of flowers or seeds." },
    { q: "Which animal's young is called a joey?", options: ["Koala", "Kangaroo", "Both kangaroos and koalas", "Platypus"], answer: 2, explanation: "Both kangaroo and koala babies are called joeys." },
    { q: "What is a seahorse's most unusual parenting feature?", options: ["It lays eggs in a tree", "The male carries developing young", "It raises young in a nest", "It feeds young with milk"], answer: 1, explanation: "In seahorses, the male carries developing young in a special pouch." },
    { q: "What makes a cactus's spines useful?", options: ["They help it lose water", "They help reduce water loss", "They absorb sunlight", "They help it swim"], answer: 1, explanation: "Cactus spines are modified leaves that help reduce water loss." }
  ];

  function initializeQuizPage() {
    currentQuiz = 0;
    quizScore = 0;
    quizAnswered = false;
    Quiz();
    populateCompare();
  }

  function Quiz() {
    const question = questions[currentQuiz];
    if (!question) {
      byId("quiz-panel").innerHTML = `<div class="quiz-score"><span>✳</span><h2>That's a wrap, nature explorer.</h2><p>You got ${quizScore} out of ${questions.length} right. Every answer is another little discovery.</p><button class="button button-dark" id="restart-quiz">Try again <span>↻</span></button></div>`;
      byId("restart-quiz").addEventListener("click", initializeQuizPage);
      return;
    }
    byId("quiz-panel").innerHTML = `
      <div class="quiz-topline"><span>Nature quiz</span><span>Question ${currentQuiz + 1} of ${questions.length}</span></div>
      <div class="quiz-progress"><span style="width:${((currentQuiz + 1) / questions.length) * 100}%"></span></div>
      <h2 class="quiz-question">${escapeHtml(question.q)}</h2>
      <div class="quiz-options">${question.options.map((option, index) => `<button class="quiz-option" data-answer="${index}">${escapeHtml(option)}</button>`).join("")}</div>
      <p class="quiz-feedback" id="quiz-feedback" aria-live="polite"></p>
      <button class="button button-dark quiz-next hidden" id="quiz-next">Next question <span>→</span></button>`;
    byId("quiz-panel").querySelectorAll(".quiz-option").forEach(button => {
      button.addEventListener("click", () => answerQuestion(Number(button.dataset.answer), button));
    });
  }

  function answerQuestion(answer, selectedButton) {
    if (quizAnswered) return;
    quizAnswered = true;
    const question = questions[currentQuiz];
    const buttons = [...byId("quiz-panel").querySelectorAll(".quiz-option")];
    buttons.forEach(button => {
      button.disabled = true;
      if (Number(button.dataset.answer) === question.answer) button.classList.add("correct");
    });
    const correct = answer === question.answer;
    if (correct) quizScore += 1;
    if (!correct) selectedButton.classList.add("incorrect");
    byId("quiz-feedback").textContent = `${correct ? "That's right!" : "Not quite!"} ${question.explanation}`;
    const next = byId("quiz-next");
    next.classList.remove("hidden");
    next.textContent = currentQuiz === questions.length - 1 ? "See your result →" : "Next question →";
    next.addEventListener("click", () => {
      currentQuiz += 1;
      quizAnswered = false;
      Quiz();
    }, { once: true });
  }

  function populateCompare() {
    const options = allSpecies.map(species => `<option value="${species.id}">${escapeHtml(species.name)} · ${escapeHtml(species.categoryLabel)}</option>`).join("");
    byId("compare-one").innerHTML = options;
    byId("compare-two").innerHTML = options;
    byId("compare-one").selectedIndex = 0;
    byId("compare-two").selectedIndex = Math.min(1, allSpecies.length - 1);
    byId("compare-result").innerHTML = "";
  }

  function renderComparison() {
    const first = speciesById(byId("compare-one").value);
    const second = speciesById(byId("compare-two").value);
    if (!first || !second) return;
    if (first.id === second.id) {
      byId("compare-result").innerHTML = `<p class="quiz-feedback" role="status">Choose two different species to compare their field notes.</p>`;
      return;
    }
    const fields = [
      ["Category", species => species.categoryLabel],
      ["Scientific name", species => species.scientific],
      ["Origin / region", species => species.origin || species.region],
      ["Habitat", species => species.habitat],
      ["Diet / uses", species => species.diet || species.uses],
      ["Lifespan", species => species.lifespan],
      ["Interesting fact", species => species.fact]
    ];
    const column = species => `<article class="compare-card"><h3>${escapeHtml(species.name)}</h3><p class="scientific">${escapeHtml(species.scientific)}</p>${fields.map(([label, value]) => `<div class="compare-row"><span>${label}</span><strong>${escapeHtml(value(species) || "—")}</strong></div>`).join("")}</article>`;
    byId("compare-result").innerHTML = `<div class="compare-columns">${column(first)}${column(second)}</div>`;
  }

  function wireEvents() {
    document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      if (categoryOrder.includes(link.dataset.page)) setPage("catalog", link.dataset.page);
      else setPage(link.dataset.page);
    }));
    document.querySelectorAll(".search-form").forEach(form => form.addEventListener("submit", event => {
      event.preventDefault();
      const value = form.querySelector("input").value;
      setPage("catalog", "", value);
    }));
    document.querySelectorAll(".category-explore").forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      setPage("catalog", link.dataset.category);
    }));
    byId("header-search").addEventListener("click", () => {
      setPage("catalog");
      byId("catalog-search-input").focus();
    });
    byId("mobile-menu").addEventListener("click", () => {
      const expanded = byId("mobile-menu").getAttribute("aria-expanded") === "true";
      byId("mobile-menu").setAttribute("aria-expanded", String(!expanded));
      byId("mobile-menu").setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
      byId("mobile-menu").textContent = expanded ? "☰" : "×";
      byId("main-nav").classList.toggle("open", !expanded);
    });
    byId("catalog-search-input").addEventListener("input", renderCatalog);
    ["category-filter", "continent-filter", "habitat-filter"].forEach(id => byId(id).addEventListener("change", renderCatalog));
    byId("clear-filters").addEventListener("click", () => {
      byId("catalog-search-input").value = "";
      byId("category-filter").value = "";
      byId("continent-filter").value = "";
      byId("habitat-filter").value = "";
      renderCatalog();
    });
    byId("species-grid").addEventListener("click", event => {
      const card = event.target.closest("[data-open-species]");
      if (card) openSpecies(speciesById(card.dataset.openSpecies));
    });
    byId("species-grid").addEventListener("keydown", event => {
      const card = event.target.closest("[data-open-species]");
      if (card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openSpecies(speciesById(card.dataset.openSpecies));
      }
    });
    byId("dialog-close").addEventListener("click", () => byId("species-dialog").close());
    byId("species-dialog").addEventListener("click", event => {
      if (event.target === byId("species-dialog")) byId("species-dialog").close();
    });
    byId("new-fact").addEventListener("click", showRandomFact);
    byId("daily-discover").addEventListener("click", () => openSpecies(getDailySpecies()));
    byId("daily-card").addEventListener("click", () => openSpecies(getDailySpecies()));
    byId("compare-button").addEventListener("click", renderComparison);
    byId("home-page").addEventListener("click", event => {
      if (event.target.closest('a[href="#quiz"]')) {
        event.preventDefault();
        setPage("quiz");
      }
    });
    document.querySelectorAll('a[href="#home"], .back-top').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      setPage("home");
    }));
  }

  function init() {
    buildSpecies();
    createCategoryCards();
    populateFilters();
    renderDaily();
    byId("fact-of-the-day").textContent = factOfTheDay();
    wireEvents();
    const initial = location.hash.slice(1);
    if (categoryOrder.includes(initial)) setPage("catalog", initial);
    else if (["history", "quiz", "about"].includes(initial)) setPage(initial);
  }

  init();
})();
