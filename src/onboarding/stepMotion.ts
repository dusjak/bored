import { router, type Href } from 'expo-router';

/** Forward rises from below. Back is that motion played the other way. */
export type StepDirection = 'forward' | 'back';

let direction: StepDirection = 'forward';

export function stepDirection(): StepDirection {
  return direction;
}

/** A push. The new step enters from below, the way OptionRise does today. */
export function pushStep(href: Href) {
  direction = 'forward';
  router.push(href);
}

/** A back press. The current step leaves downward. The previous step enters from above. */
export function backStep() {
  direction = 'back';
  router.back();
}
