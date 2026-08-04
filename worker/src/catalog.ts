export interface MethodDef {
  key: string;
  method: string;
  title: string;
}

export const UNP_BASIC: MethodDef[] = [
  { key: "base", method: "getBaseInfoByRegNum", title: "Общие данные" },
  { key: "short", method: "getShortInfoByRegNum", title: "Краткие сведения" },
  { key: "names", method: "getJurNamesByRegNum", title: "Наименование" },
  { key: "address", method: "getAddressByRegNum", title: "Адрес" },
  { key: "ved", method: "getVEDByRegNum", title: "Вид деятельности" },
  { key: "ipfio", method: "getIPFIOByRegNum", title: "ФИО ИП" },
  { key: "events", method: "getEventByRegNum", title: "События" },
];

export const UNP_HISTORY: MethodDef[] = [
  { key: "address_h", method: "getAllAddressByRegNum", title: "Адрес (с историей)" },
  { key: "names_h", method: "getAllJurNamesByRegNum", title: "Наименование (с историей)" },
  { key: "ved_h", method: "getAllVEDByRegNum", title: "Вид деятельности (с историей)" },
  { key: "ipfio_h", method: "getAllIPFIOByRegNum", title: "ФИО ИП (с историей)" },
];

export const UNP_GO: MethodDef[] = [
  { key: "go_info", method: "getGOInfoByRegNum", title: "GO: сведения" },
  { key: "go_info_h", method: "getGOInfoHByRegNum", title: "GO: сведения (история)" },
  { key: "go_name", method: "getGONameByRegNum", title: "GO: наименование" },
  { key: "go_name_h", method: "getGONameHByRegNum", title: "GO: наименование (история)" },
  { key: "go_addr", method: "getGOAddressByRegNum", title: "GO: адрес" },
  { key: "go_addr_h", method: "getGOAddressHByRegNum", title: "GO: адрес (история)" },
  { key: "go_tel", method: "getGOTelByRegNum", title: "GO: телефон" },
  { key: "go_tel_h", method: "getGOTelHByRegNum", title: "GO: телефон (история)" },
  { key: "go_pod", method: "getGOPodByRegNum", title: "GO: подразделение" },
  { key: "go_pod_h", method: "getGOPodHByRegNum", title: "GO: подразделение (история)" },
  { key: "go_pred", method: "getGOPredByRegNum", title: "GO: председатель" },
  { key: "go_pree", method: "getGOPreeByRegNum", title: "GO: преемник" },
];

export const UNP_OTHER: MethodDef[] = [
  { key: "ip_to_jur", method: "getIPtoJurByRegNum", title: "ИП → ЮЛ" },
];

export const PERIOD_METHODS: MethodDef[] = [
  { key: "base", method: "getBaseInfoByPeriod", title: "Общие данные за период" },
  { key: "short", method: "getShortInfoByPeriod", title: "Краткие сведения за период" },
  { key: "names", method: "getJurNamesByPeriod", title: "Наименования за период" },
  { key: "address", method: "getAddressByPeriod", title: "Адреса за период" },
  { key: "ved", method: "getVEDByPeriod", title: "Виды деятельности за период" },
  { key: "ipfio", method: "getIPFIOByPeriod", title: "ФИО ИП за период" },
  { key: "events", method: "getEventByPeriod", title: "События за период" },
  { key: "ip_to_jur", method: "getIPtoJurByPeriod", title: "ИП → ЮЛ за период" },
];

export const BULK_METHODS: MethodDef[] = [
  { key: "all_likvid_ul", method: "getAllLikvidUL", title: "Все ЮЛ в ликвидации" },
  { key: "all_likvid_ip", method: "getAllLikvidIP", title: "Все ИП в ликвидации" },
  { key: "all_ip_to_jur", method: "getAllIPtoJur", title: "Все связи ИП → ЮЛ" },
  { key: "go_info_all", method: "getGOInfoAll", title: "GO: все сведения" },
  { key: "go_name_all", method: "getGONameAll", title: "GO: все наименования" },
  { key: "go_addr_all", method: "getGOAddressAll", title: "GO: все адреса" },
  { key: "go_tel_all", method: "getGOTelAll", title: "GO: все телефоны" },
  { key: "go_pod_all", method: "getGOPodAll", title: "GO: все подразделения" },
  { key: "go_pred_all", method: "getGOPredAll", title: "GO: все председатели" },
  { key: "go_pree_all", method: "getGOPreeAll", title: "GO: все преемники" },
];

export const STATES: Record<string, string> = {
  "1": "Действующий",
  "2": "Исключен из ЕГР",
  "3": "В процессе ликвидации",
  "4": "Процедура банкротства",
  "5": "Прекращение в результате реорганизации",
  "6": "Переход в другой РО",
  "7": "Переход в другой ТО",
  "8": "Прекращение в прежней ОПФ",
  "9": "Ошибка",
  "10": "Приостановлена деятельность",
  "11": "Утрата правоспособности",
  "12": "Регистрация аннулирована",
};

export const FIELD_LABELS: Record<string, string> = {
  ngrn: "УНП",
  vnaim: "Полное наименование",
  vn: "Сокр. наименование",
  vfn: "Фирменное наименование",
  dfrom: "Дата регистрации",
  dto: "Дата исключения",
  vnsostk: "Состояние",
  vnvobp: "Вид объекта",
  vnvdnp: "Вид деятельности",
  vkodp: "Код ОКЭД",
  vfio: "ФИО",
  vregion: "Область",
  vdistrict: "Район",
  vnp: "Населённый пункт",
  vulitsa: "Улица",
  vdom: "Дом",
  vkorp: "Корпус",
  vpom: "Помещение",
  nindex: "Индекс",
};

export function unpMethods(scope: string): MethodDef[] {
  const methods = [...UNP_BASIC];
  if (scope === "history" || scope === "all") methods.push(...UNP_HISTORY);
  if (scope === "go" || scope === "all") methods.push(...UNP_GO);
  if (scope === "other" || scope === "all") methods.push(...UNP_OTHER);
  return methods;
}
