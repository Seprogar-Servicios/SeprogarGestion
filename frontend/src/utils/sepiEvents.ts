export type SepiTutorialId =
  | 'motivos'
  | 'pagos'
  | 'recibos'
  | 'materiales'
  | 'categorias'
  | 'especialidades'
  | 'usuarios';

export const SEPI_START_TUTORIAL = 'sepi:start-tutorial';
export const SEPI_OPEN = 'sepi:open';

export interface SepiTutorialDetail {
  tutorialId: SepiTutorialId;
}

export function startSepiTutorial(tutorialId: SepiTutorialId) {
  window.dispatchEvent(
    new CustomEvent<SepiTutorialDetail>(SEPI_START_TUTORIAL, {
      detail: { tutorialId },
    })
  );
}

export function openSepi() {
  window.dispatchEvent(new CustomEvent(SEPI_OPEN));
}
