import type { BackupMode } from '@/backup/mode';

export const BACKUP_TITLE = 'Sikkerhetskopi';
export const BETA_LABEL = 'Beta';

export const HONESTY_LINE = 'Alt ligger bare på denne telefonen.';

export const SCREEN_OFF_BODY =
  'Alt ligger bare på denne telefonen. Med sikkerhetskopi slipper du å begynne på nytt hvis du mister eller bytter telefon.';

export const E2E_LINE =
  'Alt krypteres på telefonen før det lagres på en server i Stockholm. Bare du kan lese notatene dine.';

export const PREVIEW_INTRO =
  'Testversjon: sikkerhetskopiering er ikke koblet på ennå. Det du slår på her, lagres ikke utenfor telefonen.';

export const PREVIEW_STATUS = 'Slått på (test). Ingenting er lagret utenfor telefonen ennå.';

export const PREVIEW_NO_CLOUD = 'I testversjonen finnes det ingen kopi i skyen.';

export const ACCOUNT_APPLE = 'Logget på med Apple';
export const ACCOUNT_ANONYMOUS = 'Uten konto';

export const ANONYMOUS_LIMIT =
  'Uten konto kan kopien bare hentes på denne telefonen. Koble til Apple for å kunne hente den på en ny telefon.';

export const APPLE_HELP =
  'Du kan også fjerne tilgangen i Innstillinger → [navnet ditt] → Logg på og sikkerhet → Logg på med Apple.';

export const CONTINUE_WITHOUT_ACCOUNT = 'Fortsett uten konto';
export const LINK_APPLE_LABEL = 'Koble til Apple';
export const TURN_OFF = 'Slå av sikkerhetskopi';
export const DELETE_ACCOUNT = 'Slett konto';
export const PRIVACY = 'Personvernerklæring';
/** Space above the existing Personvernerklæring link. Not a new row. */
export const PRIVACY_LINK_GAP = 4;
export const TRY_AGAIN = 'Prøv igjen';

export const DELETED_MESSAGE = 'Kontoen er slettet. Det som ligger på telefonen, er urørt.';
export const SIGN_IN_AGAIN = 'Logg på igjen for å fortsette sikkerhetskopien.';
export const LINKED_MESSAGE = 'Koblet til Apple. Nå kan du hente kopien på en ny telefon.';
export const OFFLINE_NOTE = 'Ikke på nett. Prøver igjen senere.';
export const SYNC_ERROR = 'noe gikk galt. prøv igjen.';

export const KEY_MISSING_TITLE = 'Kopien kan ikke leses på denne telefonen.';
export const KEY_MISSING_BODY =
  'Nøkkelen som låser opp kopien, ligger i iCloud-nøkkelringen. Slå på nøkkelringen i Innstillinger → [navnet ditt] → iCloud → Passord og nøkkelring, og prøv igjen.';
export const START_NEW_BACKUP = 'Start en ny sikkerhetskopi';

export const FETCHED_PREFIX = 'Hentet';
export const FETCHED_SUFFIX = 'økter fra sikkerhetskopien.';
/** Sample count from the 10f frame. Preview does not download sessions. */
export const FETCHED_SAMPLE = '28';

export const DEG_OFF = 'Av';
export const DEG_ON = 'På';
export const DEG_ON_TEST = 'På (test)';
export const DEG_STALE = 'Ikke oppdatert';

export const NOTIFICATIONS_OFF_LINE = 'Varsler er slått av for appen. Åpne Innstillinger ›';

export const NUDGE_TITLE = 'Vil du sikkerhetskopiere øktene dine?';
export const NUDGE_BODY =
  'Øktene og notatene dine er bare lagret på denne telefonen. Med sikkerhetskopiering beholder du dem hvis du bytter telefon.';
export const NUDGE_ENABLE = 'Slå på sikkerhetskopiering';
export const NUDGE_LATER = 'Ikke nå';
export const NUDGE_CLOSE = 'Lukk';

export const PREVIEW_MENU_TITLE = 'Forhåndsvis tilstand';

export function storageLine(mode: BackupMode): string {
  return mode === 'preview' ? PREVIEW_INTRO : E2E_LINE;
}

export function statusLine(mode: BackupMode): string {
  return mode === 'preview' ? PREVIEW_STATUS : '';
}

export function turnOffMessage(mode: BackupMode, anonymous: boolean): string {
  if (mode === 'preview') {
    return anonymous
      ? `Uten konto kan du ikke logge på igjen. ${PREVIEW_NO_CLOUD} Det som ligger på telefonen, blir liggende.`
      : `Det som ligger på telefonen, blir liggende. ${PREVIEW_NO_CLOUD}`;
  }
  return anonymous
    ? 'Uten konto kan du ikke logge på igjen, så kopien i skyen slettes. Det som ligger på telefonen, blir liggende.'
    : 'Det som ligger på telefonen, blir liggende. Kopien i skyen blir liggende til du sletter kontoen.';
}

export function deleteAccountMessage(mode: BackupMode): string {
  if (mode === 'preview') {
    return `${PREVIEW_NO_CLOUD} Det som ligger på denne telefonen, blir liggende. Dette kan ikke angres.`;
  }
  return 'Sikkerhetskopien i skyen slettes for godt. Det som ligger på denne telefonen, blir liggende. Dette kan ikke angres.';
}

export function resetSignedInMessage(mode: BackupMode): string {
  if (mode === 'preview') {
    return `Appen blir som ny. ${PREVIEW_NO_CLOUD} Alle økter, notater og innstillinger forsvinner. Dette kan ikke angres.`;
  }
  return 'Appen blir som ny, og sikkerhetskopien i skyen slettes også. Alle økter, notater og innstillinger forsvinner. Dette kan ikke angres. Kontoen slettes også.';
}

export const RESET_LOCAL_MESSAGE =
  'Appen blir som ny på denne telefonen. Alle økter, notater og innstillinger slettes. Dette kan ikke angres.';

export const ALERT_TURN_OFF = 'Slå av sikkerhetskopi?';
export const ALERT_DELETE = 'Slette kontoen?';
export const ALERT_RESET = 'Nullstille alt?';
export const ALERT_SWITCH = 'Bytte Apple-konto?';
export const ALERT_SWITCH_BODY =
  'Telefonen er koblet til en annen Apple-konto. Bytter du, legges alt på telefonen til i kopien på den nye kontoen. Kopien på den gamle kontoen blir liggende urørt, men oppdateres ikke lenger.';
export const ALERT_SIGN_IN_FAILED = 'Kunne ikke logge på';
export const ALERT_OFFLINE = 'Ikke på nett';
export const ALERT_OFFLINE_RESET =
  'Du må være på nett for å nullstille, fordi kopien i skyen også skal slettes. Ingenting er endret.';
export const ALERT_OFFLINE_DELETE = 'Du må være på nett for å slette kontoen. Ingenting er slettet.';
export const ALERT_OFFLINE_LINK = 'Du må være på nett for å koble til Apple.';
export const ALERT_RESET_FAILED = 'Kunne ikke nullstille';
export const ALERT_RESET_FAILED_BODY =
  'Sikkerhetskopien i skyen ble ikke slettet, så ingenting er endret. Prøv igjen.';
export const ALERT_EXISTS = 'Du har allerede en sikkerhetskopi';
export const ALERT_EXISTS_BODY =
  'Denne Apple-kontoen har en kopi fra før. Det som ligger på telefonen, legges til i den, og kopien uten konto slettes.';
export const ALERT_NEW = 'Starte en ny sikkerhetskopi?';
export const ALERT_NEW_BODY =
  'Den gamle kopien kan ikke leses uten nøkkelen, og blir slettet. Det som ligger på telefonen, blir den nye kopien.';

export const CONFIRM_TURN_OFF = 'Slå av';
export const CONFIRM_DELETE = 'Slett konto';
export const CONFIRM_RESET = 'Nullstill';
export const CONFIRM_SWITCH = 'Bytt konto';
export const CONFIRM_CONTINUE = 'Fortsett';
export const CONFIRM_NEW = 'Start på nytt';
export const CONFIRM_CANCEL = 'Avbryt';
export const CONFIRM_OK = 'OK';
