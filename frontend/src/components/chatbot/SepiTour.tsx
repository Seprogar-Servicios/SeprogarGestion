import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import {
  SEPI_START_TUTORIAL,
  type SepiTutorialDetail,
  type SepiTutorialId,
} from '../../utils/sepiEvents';
import { SEPI_TUTORIALS } from './tutorials';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface BubblePos {
  top: number;
  left: number;
  placement: Placement;
}

const getSelector = (target: string) => `[data-sepi-target="${target}"]`;

function computeBubble(rect: DOMRect, placement: Placement): BubblePos {
  const gap = 14;
  const bubbleW = 300;
  const bubbleH = 160;

  let top = rect.bottom + gap;
  let left = rect.left + rect.width / 2 - bubbleW / 2;
  let finalPlacement = placement;

  if (placement === 'top') {
    top = rect.top - bubbleH - gap;
    left = rect.left + rect.width / 2 - bubbleW / 2;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - bubbleH / 2;
    left = rect.left - bubbleW - gap;
  } else if (placement === 'right') {
    top = rect.top + rect.height / 2 - bubbleH / 2;
    left = rect.right + gap;
  }

  // Mantener dentro del viewport
  left = Math.max(12, Math.min(left, window.innerWidth - bubbleW - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - bubbleH - 12));

  // Si no entra arriba, forzar abajo
  if (placement === 'top' && rect.top < bubbleH + gap + 20) {
    top = rect.bottom + gap;
    finalPlacement = 'bottom';
  }

  return { top, left, placement: finalPlacement };
}

const SepiTour: React.FC = () => {
  const navigate = useNavigate();
  const [tutorialId, setTutorialId] = useState<SepiTutorialId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubble, setBubble] = useState<BubblePos | null>(null);

  const tutorial = tutorialId ? SEPI_TUTORIALS[tutorialId] : null;
  const step = tutorial?.steps[stepIndex];

  const stopTour = useCallback(() => {
    setTutorialId(null);
    setStepIndex(0);
    setTargetRect(null);
    setBubble(null);
  }, []);

  const updateTarget = useCallback(() => {
    if (!step) {
      setTargetRect(null);
      setBubble(null);
      return;
    }
    const el = document.querySelector(getSelector(step.target)) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      // Bubble flotante centrada inferior si aún no existe el target (ej. modal cerrado)
      setBubble({
        top: window.innerHeight - 200,
        left: Math.max(12, window.innerWidth / 2 - 150),
        placement: 'top',
      });
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setBubble(computeBubble(rect, step.placement || 'bottom'));
  }, [step]);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<SepiTutorialDetail>).detail;
      if (!detail?.tutorialId) return;
      const t = SEPI_TUTORIALS[detail.tutorialId];
      if (!t) return;
      navigate(t.route);
      setTutorialId(detail.tutorialId);
      setStepIndex(0);
    };
    window.addEventListener(SEPI_START_TUTORIAL, onStart as EventListener);
    return () => window.removeEventListener(SEPI_START_TUTORIAL, onStart as EventListener);
  }, [navigate]);

  useEffect(() => {
    if (!tutorial || !step) return;

    // Si el paso pide abrir (click) el target al entrar
    if (step.openOnEnter) {
      const prev = tutorial.steps[stepIndex - 1];
      if (prev) {
        const prevEl = document.querySelector(getSelector(prev.target)) as HTMLElement | null;
        // Si el target actual no existe, intentar clickear el del paso anterior (ej. Nuevo)
        const currentEl = document.querySelector(getSelector(step.target));
        if (!currentEl && prevEl) {
          prevEl.click();
        }
      }
    }

    updateTarget();
    const interval = window.setInterval(updateTarget, 250);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [tutorial, step, stepIndex, updateTarget]);

  const goNext = useCallback(() => {
    if (!tutorial) return;
    window.setTimeout(() => {
      if (stepIndex < tutorial.steps.length - 1) {
        setStepIndex((s) => s + 1);
      } else {
        stopTour();
      }
    }, 180);
  }, [tutorial, stepIndex, stopTour]);

  // Avanzar al hacer click solo en botones/acciones (no en inputs al enfocar)
  useEffect(() => {
    if (!step || !tutorial) return;
    const el = document.querySelector(getSelector(step.target)) as HTMLElement | null;
    if (!el) return;

    const tag = el.tagName.toLowerCase();
    const isAction =
      tag === 'button' ||
      tag === 'a' ||
      el.getAttribute('role') === 'button' ||
      step.target.endsWith('-create') ||
      step.target.endsWith('-guardar') ||
      step.target.endsWith('-pendientes');

    if (!isAction) return;

    el.addEventListener('click', goNext);
    return () => el.removeEventListener('click', goNext);
  }, [step, tutorial, goNext]);

  // En selects: al elegir una opción (valor no vacío) pasar al siguiente paso
  useEffect(() => {
    if (!step || !tutorial) return;
    const el = document.querySelector(getSelector(step.target)) as HTMLElement | null;
    if (!el || el.tagName.toLowerCase() !== 'select') return;

    const onChange = (event: Event) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value !== '') goNext();
    };

    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [step, tutorial, goNext]);

  if (!tutorial || !step || !bubble) return null;

  const isLast = stepIndex >= tutorial.steps.length - 1;
  const targetMissing = !targetRect;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {/* Spotlight ring */}
      {targetRect && (
        <div
          className="fixed rounded-xl ring-4 ring-blue-500 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] pointer-events-none transition-all duration-200"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Avatar flotante junto al target + burbuja */}
      <div
        className="fixed z-[81] pointer-events-auto w-[300px] transition-all duration-300 ease-out"
        style={{ top: bubble.top, left: bubble.left }}
      >
        <div className="flex items-start gap-2">
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center border-2 border-white animate-bounce">
              <Bot className="h-6 w-6" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sepi</p>
                <p className="text-[11px] text-gray-500">
                  {tutorial.title} · Paso {stepIndex + 1}/{tutorial.steps.length}
                </p>
              </div>
              <button
                type="button"
                onClick={stopTour}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Salir"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug mb-3">
              {targetMissing
                ? `${step.text} (abrí el formulario si aún no está visible)`
                : step.text}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={stepIndex <= 0}
                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) stopTour();
                  else setStepIndex((s) => s + 1);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLast ? 'Listo' : 'Siguiente'}
              </button>
              <button
                type="button"
                onClick={stopTour}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-100"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SepiTour;
