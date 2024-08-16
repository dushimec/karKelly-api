import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import path from "path";

const BodyLanguageDetector = {
  type: "languageDetector",
  name: "BodyLanguageDetector",
  async: false,

  detect(req) {
    if (req && req.body && req.body.languageTest) {
      const languageMap = {
        english: "en",
        french: "fr",
        kinyarwanda: "rw",
      };

      const languageCode = languageMap[req.body.languageTest.toLowerCase()];
      return languageCode;
    }
    return null;
  },

  init(services, detectorOptions, i18nextOptions) {},
    cacheUserLanguage(req, res, lng) {}
};

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .use(BodyLanguageDetector)
  .init({
    fallbackLng: "rw",
    backend: {
      loadPath: path.join(__dirname, "/locales/{{lng}}/translation.json"),
    },
    detection: {
      order: [
        "BodyLanguageDetector",
        "header",
        "cookie",
        "querystring",
      ],
      caches: ["cookie"],
    },
    preload: ["rw", "fr", "en"],
    debug: false,
  });

export default i18next;