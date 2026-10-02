// Copy this file to story-26.js, story-27.js, etc.
// Then register the new story in data/stories.js.
//
// The object structure must stay compatible with the app.

const story = {
  id: 26,
  country: "Country",
  continent: "Europe",
  category: "Culture",
  level: "A2",
  estimatedMinutes: 5,
  flag: "🌍",

  titles: {
    en: "Story title",
    fr: "Titre de l'histoire",
    nl: "Titel van het verhaal"
  },

  texts: {
    en: "Write the English story here. Use complete sentences.",
    fr: "Écrivez ici le texte français.",
    nl: "Schrijf hier de Nederlandse tekst."
  },

  summaries: {
    en: "Short summary.",
    fr: "Court résumé.",
    nl: "Korte samenvatting."
  },

  hooks: {
    en: "A short hook that makes the learner curious.",
    fr: "Une phrase qui donne envie de lire.",
    nl: "Een korte zin die nieuwsgierig maakt."
  },

  vocabulary: [
    {
      word: "example",
      translations: {
        en: "example",
        fr: "exemple",
        nl: "voorbeeld"
      },
      definitions: {
        en: "A simple definition.",
        fr: "Une définition simple.",
        nl: "Een eenvoudige definitie."
      },
      examples: {
        en: "An example sentence.",
        fr: "Une phrase d'exemple.",
        nl: "Een voorbeeldzin."
      }
    }
  ],

  grammarFocus: {
    en: "Present tense.",
    fr: "Présent.",
    nl: "Tegenwoordige tijd."
  },

  quiz: [
    {
      question: {
        en: "Question?",
        fr: "Question ?",
        nl: "Vraag?"
      },
      options: {
        en: ["Answer A", "Answer B", "Answer C", "Answer D"],
        fr: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
        nl: ["Antwoord A", "Antwoord B", "Antwoord C", "Antwoord D"]
      },
      answer: 0
    }
  ]
};

export default story;