export type Locale = "en" | "ru" | "kk";

export const localeOptions: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ru", label: "Русский" },
  { id: "kk", label: "Қазақша" },
];

export const messages: Record<Locale, {
  tabs: string[];
  shortTabs: string[];
  steps: string[];
  stepHints: string[];
  introTitles: string[];
  introDescriptions: string[];
  weekly: string;
  planned: string;
}> = {
  en: {
    tabs: ["Build my plan", "My meal plan", "Grocery list", "Food database"],
    shortTabs: ["Planner", "My week", "Groceries", "Explore"],
    steps: ["Your kitchen", "Budget & stores", "Food & goals"],
    stepHints: ["Start with what you have", "Choose your weekly spend", "Tell us what feels right"],
    introTitles: ["Eat well. Make it yours.", "Your week, on the menu.", "Everything for your week.", "Find your everyday favorites."],
    introDescriptions: ["A week of meals, built around your kitchen, budget and goals.", "Four meals a day. One less thing to think about.", "A store-by-store checklist, with whole packs and estimated prices.", "Explore Astana’s groceries and compare nutrition estimates."],
    weekly: "7 days", planned: "Planned for you",
  },
  ru: {
    tabs: ["Собрать план", "Мой план", "Список покупок", "Каталог продуктов"],
    shortTabs: ["План", "Неделя", "Покупки", "Каталог"],
    steps: ["Ваша кухня", "Бюджет и магазины", "Питание и цели"],
    stepHints: ["Начните с того, что есть", "Выберите бюджет на неделю", "Расскажите о своих целях"],
    introTitles: ["Питайтесь хорошо. По-своему.", "Ваша неделя уже в меню.", "Всё для вашей недели.", "Продукты на каждый день."],
    introDescriptions: ["Неделя блюд с учётом кухни, бюджета и целей.", "Четыре приёма пищи в день. Меньше решений.", "Список по магазинам, упаковкам и примерным ценам.", "Продукты Астаны и их примерная питательная ценность."],
    weekly: "7 дней", planned: "План готовится",
  },
  kk: {
    tabs: ["Жоспар құру", "Менің жоспарым", "Сатып алу тізімі", "Өнімдер базасы"],
    shortTabs: ["Жоспар", "Аптам", "Сатып алу", "Өнімдер"],
    steps: ["Ас үйіңіз", "Бюджет және дүкендер", "Тамақтану және мақсат"],
    stepHints: ["Қолда бардан бастаңыз", "Апталық шығынды таңдаңыз", "Мақсатыңызды айтыңыз"],
    introTitles: ["Дәмді тамақ. Өзіңізге сай.", "Аптаңыз мәзірде.", "Аптаға қажеттінің бәрі.", "Күнделікті өнімдеріңіз."],
    introDescriptions: ["Ас үйіңізге, бюджетіңізге және мақсатыңызға сай бір апталық мәзір.", "Күніне төрт рет тамақ. Бір шешім аз.", "Дүкендерге бөлінген және бағасы есептелген тізім.", "Астана өнімдері және олардың қоректік құндылығы."],
    weekly: "7 күн", planned: "Сізге жоспарланды",
  },
};
