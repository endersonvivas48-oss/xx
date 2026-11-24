export interface TutorialStep {
  stepNumber: number;
  instruction: string;
  hint: string;
  requiredAction: 'ROLL_DICE' | 'SUMMON' | 'MOVE' | 'ATTACK' | 'CAST_SPELL' | 'TRANSMUTE';
}

export interface HouseTutorialLesson {
  houseId: string;
  title: string;
  topic: string;
  description: string;
  isCombatLesson?: boolean;
  guideSteps: TutorialStep[];
  startingMana: number;
  forcedDice?: [number, number, number];
  aiUnitsCount: number;
  objectiveText: string;
}

/**
 * Identifica si una casa residencial imparte un consejo con práctica de combate (batalla en tablero)
 * o si es un consejo puramente informativo / de exploración / sistema de campañas (sin batalla).
 */
export function isHouseBattleLesson(houseId: string): boolean {
  // Las casas 9 (El Gran Torneo / acceso a la Arena) y 10 (Selector de Campañas)
  // ofrecen orientación sobre el reino y los sistemas, no mecánicas de combate con simulación.
  // La casa 12 ahora imparte la práctica de la Escalera Táctica Marcial en combate.
  const NON_BATTLE_HOUSES = ['house_9', 'house_10'];
  return !NON_BATTLE_HOUSES.includes(houseId);
}

export const HOUSE_TUTORIAL_LESSONS: Record<string, HouseTutorialLesson> = {
  house_1: {
    houseId: 'house_1',
    title: 'Lección I: Combinaciones y Maestría',
    topic: 'Tiradas y Maestría',
    description: 'Aprende cómo dos dados idénticos definen el nivel de la criatura y el tercer dado su maestría con estadísticas aumentadas.',
    isCombatLesson: true,
    startingMana: 2,
    forcedDice: [3, 3, 5],
    aiUnitsCount: 1,
    objectiveText: 'Lanza los dados y coloca tu criatura en el tablero para finalizar la lección.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Tira los 3 dados de turno.',
        hint: 'Pulsa el botón "🎲 TIRAR DADOS" en el panel izquierdo.',
        requiredAction: 'ROLL_DICE',
      },
      {
        stepNumber: 2,
        instruction: 'Toca una de las casillas doradas adyacentes a tu Rey.',
        hint: 'Pulsa "Invocar" en la ventana emergente y luego toca una casilla dorada.',
        requiredAction: 'SUMMON',
      },
    ],
  },
  house_2: {
    houseId: 'house_2',
    title: 'Lección II: El Despertar del Titán',
    topic: 'Titanes Ascendidos',
    description: 'Los triples sagrados desatan a los Titanes. Experimenta el poder de un triple (2-2-2) y su Escudo Solar.',
    startingMana: 3,
    forcedDice: [2, 2, 2],
    aiUnitsCount: 1,
    objectiveText: 'Lanza la tirada sagrada y coloca al Titán en el campo.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Lanza los 3 dados de turno.',
        hint: 'Pulsa "🎲 TIRAR DADOS".',
        requiredAction: 'ROLL_DICE',
      },
      {
        stepNumber: 2,
        instruction: 'Desata el poder del Titán en el tablero.',
        hint: 'Pulsa "¡DESATAR SU PODER!" y selecciona una celda dorada.',
        requiredAction: 'SUMMON',
      },
    ],
  },
  house_3: {
    houseId: 'house_3',
    title: 'Lección III: Transmutación de Emergencia',
    topic: 'Transmutación Arcana',
    description: 'Cuando el enemigo te supera en tropas y tienes 4 de Maná, puedes forzar una invocación directa.',
    startingMana: 4,
    aiUnitsCount: 2,
    objectiveText: 'Activa la Transmutación Arcana y despliega a tu pieza en el campo.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Pulsa el botón de Transmutación Arcana en el panel izquierdo.',
        hint: 'Toca "⚡ TRANSMUTAR (4M • 100%)".',
        requiredAction: 'TRANSMUTE',
      },
      {
        stepNumber: 2,
        instruction: 'Ubica la criatura transmutada en una casilla dorada.',
        hint: 'Toca la celda dorada junto a tu Rey.',
        requiredAction: 'SUMMON',
      },
    ],
  },
  house_4: {
    houseId: 'house_4',
    title: 'Lección IV: Poder de los Orbes Elementales',
    topic: 'Orbes Elementales',
    description: 'Comprueba cómo los dados con orbes engarzados transfieren efectos pasivos y estadísticas aumentadas.',
    startingMana: 3,
    forcedDice: [2, 2, 4],
    aiUnitsCount: 1,
    objectiveText: 'Lanza los dados y despliega a tu invocador elemental.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Lanza los dados de combate.',
        hint: 'Pulsa "🎲 TIRAR DADOS".',
        requiredAction: 'ROLL_DICE',
      },
      {
        stepNumber: 2,
        instruction: 'Invoca a tu criatura elemental.',
        hint: 'Pulsa "Invocar" y toca una celda dorada.',
        requiredAction: 'SUMMON',
      },
    ],
  },
  house_5: {
    houseId: 'house_5',
    title: 'Lección V: Desplazamiento y Falange',
    topic: 'Posicionamiento y Movimiento',
    description: 'Mover consume el turno de la unidad. Mueve tu pieza aliada para tomar una posición ventajosa.',
    startingMana: 2,
    aiUnitsCount: 1,
    objectiveText: 'Selecciona y mueve a tu criatura en el tablero hexagonal.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Haz clic sobre tu tropa azul para seleccionarla y muévela a una casilla cian.',
        hint: 'Toca tu criatura aliada y luego una casilla con círculo azul/cian.',
        requiredAction: 'MOVE',
      },
    ],
  },
  house_6: {
    houseId: 'house_6',
    title: 'Lección VI: Guardia del Rey Soberano',
    topic: 'Protección del Rey Celeste',
    description: 'Aprende a proteger a tu Rey activando el Escudo protector arcano.',
    startingMana: 3,
    aiUnitsCount: 1,
    objectiveText: 'Canaliza el hechizo de Escudo sobre tu Rey Soberano.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Selecciona el hechizo de Escudo y aplícalo a tu Rey.',
        hint: 'Toca "🛡️ 2M" en el panel izquierdo, confirma "Sí, Lanzar" y pulsa sobre tu Rey.',
        requiredAction: 'CAST_SPELL',
      },
    ],
  },
  house_7: {
    houseId: 'house_7',
    title: 'Lección VII: Conjuros del Grimorio',
    topic: 'Magia y Grimorio',
    description: 'Los hechizos consumen maná y debilitan las defensas enemigas.',
    startingMana: 4,
    aiUnitsCount: 1,
    objectiveText: 'Lanza un hechizo ofensivo de Relámpago o Tormenta.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Canaliza un hechizo ofensivo (Relámpago o Escudo) desde tu Grimorio.',
        hint: 'Toca el icono de hechizo en el panel izquierdo y confirma su lanzamiento.',
        requiredAction: 'CAST_SPELL',
      },
    ],
  },
  house_8: {
    houseId: 'house_8',
    title: 'Lección VIII: Fichas en Reserva',
    topic: 'Reserva y Límite de Campo',
    description: 'Cuando no quieras invocar, guarda la ficha en reserva para ganar +1 Maná adicional.',
    startingMana: 1,
    forcedDice: [4, 4, 2],
    aiUnitsCount: 1,
    objectiveText: 'Lanza dados y guarda la tirada en reserva en vez de invocarla.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Lanza tus dados de combate.',
        hint: 'Pulsa "🎲 TIRAR DADOS".',
        requiredAction: 'ROLL_DICE',
      },
      {
        stepNumber: 2,
        instruction: 'Guarda la ficha en tu reserva táctica.',
        hint: 'Pulsa el botón "GUARDAR" en la ventana de elección para almacenar la ficha y ganar Maná.',
        requiredAction: 'SUMMON',
      },
    ],
  },
  house_9: {
    houseId: 'house_9',
    title: 'Consejo IX: Acceso al Gran Torneo',
    topic: 'El Gran Torneo',
    description: 'Aprende los requisitos de callejuela para acceder al Gran Torneo oficial.',
    isCombatLesson: false,
    startingMana: 3,
    aiUnitsCount: 0,
    objectiveText: 'Consejo informativo sobre el torneo.',
    guideSteps: [],
  },
  house_10: {
    houseId: 'house_10',
    title: 'Consejo X: Selector de Campañas',
    topic: 'Selector de Campañas',
    description: 'Orientación sobre la alternancia de campañas y conservación de mazos.',
    isCombatLesson: false,
    startingMana: 2,
    aiUnitsCount: 0,
    objectiveText: 'Consejo informativo sobre el campamento.',
    guideSteps: [],
  },
  house_11: {
    houseId: 'house_11',
    title: 'Lección XI: Cálculo de Daño y Retribución',
    topic: 'Curva de Daño y Escudos',
    description: 'Atacar cuerpo a cuerpo desgasta al enemigo y rompe sus defensas.',
    startingMana: 3,
    forcedDice: [4, 4, 1],
    aiUnitsCount: 1,
    objectiveText: 'Ataca con tu criatura aliada al maniquí enemigo adyacente.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Toca tu criatura aliada y pulsa sobre el enemigo adyacente para asestar un golpe.',
        hint: 'Haz clic en tu tropa y luego pulsa en el rival rojo adyacente.',
        requiredAction: 'ATTACK',
      },
    ],
  },
  house_12: {
    houseId: 'house_12',
    title: 'Lección XII: Escalera Táctica Marcial',
    topic: 'Armonía de Dados y Escalera',
    description: 'Aprende cómo una secuencia de 3 dados consecutivos (1-2-3, 2-3-4, 3-4-5 o 4-5-6) activa el Menú de Elección Táctica en Mano.',
    isCombatLesson: true,
    startingMana: 2,
    forcedDice: [2, 3, 4],
    aiUnitsCount: 1,
    objectiveText: 'Lanza los dados para activar la Escalera Táctica y elige una recompensa marcial.',
    guideSteps: [
      {
        stepNumber: 1,
        instruction: 'Lanza los 3 dados para obtener la Escalera Táctica (2-3-4).',
        hint: 'Pulsa el botón "🎲 TIRAR DADOS" en el panel izquierdo.',
        requiredAction: 'ROLL_DICE',
      },
    ],
  },
};
