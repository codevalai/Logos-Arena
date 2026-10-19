import { CampaignStage } from './types';

export const PHILOSOPHER_CAMPAIGN_GRAPH: CampaignStage[] = [
  {
    stageId: 1,
    chapterTitle: 'Chapter 1: The Gadfly of the Agora',
    era: 'Ancient Philosophy',
    opponentKey: 'SOCRATES',
    opponentName: 'Socrates',
    stageBackground: 'The Agora of Athens',
    matchRuleDescription: 'Beware Aporia Paradox Trap — getting hit by Socrates’ Special Move reverses your left/right movement for 3 seconds.',
    aiDifficulty: 2,
    specialModifier: 'APORIA_TRAP',
    introDialogue: [
      {
        speaker: 'Socrates',
        role: 'opponent',
        expression: 'smirk',
        text: 'Tell me, challenger: before you throw a single strike, can you define the universal essence of Victory?',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'Victory is surviving our cross-examination with my health bar intact and your paradoxes refuted.',
      },
      {
        speaker: 'Socrates',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'An unexamined combo is not worth executing. Let us test whether your frame data holds up under questioning!',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Socrates',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'By the dog of Egypt! You refuted my elenchus with a pure philosophical special counter. Go East to the State of Lu, where ritual order awaits.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Socrates',
        role: 'opponent',
        expression: 'exhausted',
        text: 'Brute force silenced my questions today... Plato’s Academy will not yield so easily to unrefined strikes.',
      },
    ],
    nextStageOnLogicalWin: 2,
    nextStageOnWillpowerWin: 3,
  },
  {
    stageId: 2,
    chapterTitle: 'Chapter 2A: Ritual & Harmony in the Courtyard of Lu',
    era: 'Ancient Philosophy',
    opponentKey: 'CONFUCIUS',
    opponentName: 'Confucius',
    stageBackground: 'The Courtyard of Lu',
    matchRuleDescription: 'Logical Branch Unlocked: Confucius uses armored staff sweeps to punish reckless rush-down pressure.',
    aiDifficulty: 2,
    introDialogue: [
      {
        speaker: 'Confucius',
        role: 'opponent',
        expression: 'calm',
        text: 'Socrates sent word of your dialectical precision. Yet wisdom without Li—proper ritual form—collapses into chaos.',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'calm',
        text: 'Show me how the rites of Lu withstand an opponent who adapts every frame.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Confucius',
        role: 'opponent',
        expression: 'calm',
        text: 'Admirable reciprocity. You neither overextended nor faltered. Advance to the Renaissance councils of Florence.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Confucius',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'Your strength is undeniable, though your spacing lacked ceremony. The Scholastic fortress of Aquinas awaits you.',
      },
    ],
    nextStageOnLogicalWin: 4,
    nextStageOnWillpowerWin: 5,
  },
  {
    stageId: 3,
    chapterTitle: 'Chapter 2B: Shadows in the Academy Grove',
    era: 'Ancient Philosophy',
    opponentKey: 'PLATO',
    opponentName: 'Plato',
    stageBackground: 'The Academy Gardens',
    matchRuleDescription: 'Willpower Branch: Plato projects geometric Form zones that deal continuous damage if you stand inside them.',
    aiDifficulty: 2,
    introDialogue: [
      {
        speaker: 'Plato',
        role: 'opponent',
        expression: 'intense',
        text: 'Let no one ignorant of geometry enter this arena! Your physical strikes are mere shadows on a cave wall.',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'Even an eternal Form shatters when struck inside its recovery frames.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Plato',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'You glimpsed the true Form of the match. Proceed to Florence, where Machiavelli tests the ethics of power.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Plato',
        role: 'opponent',
        expression: 'exhausted',
        text: 'You broke through my polyhedra by sheer momentum. Let us see how you fare against Thomas Aquinas.',
      },
    ],
    nextStageOnLogicalWin: 4,
    nextStageOnWillpowerWin: 5,
  },
  {
    stageId: 4,
    chapterTitle: 'Chapter 3A: The Fox and the Lion of Florence',
    era: 'Medieval & Renaissance',
    opponentKey: 'MACHIAVELLI',
    opponentName: 'Niccolò Machiavelli',
    stageBackground: 'The Florentine Palazzo',
    matchRuleDescription: 'Machiavelli’s attacks inflict amplified chip damage through blocks. Use counters and spacing.',
    aiDifficulty: 3,
    introDialogue: [
      {
        speaker: 'Machiavelli',
        role: 'opponent',
        expression: 'smirk',
        text: 'Virtue and honor are fine ornaments in a treatise, traveller, but in this Palazzo, frame advantage is the only sovereign law.',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'Your feints only work on those who fear the dagger more than they read the startup animation.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Machiavelli',
        role: 'opponent',
        expression: 'smirk',
        text: 'Outmaneuvered at my own game! Travel north to Königsberg—Immanuel Kant has legislated a universal rule against your style.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Machiavelli',
        role: 'opponent',
        expression: 'exhausted',
        text: 'The Lion overwhelmed the Fox. René Descartes awaits you in his Dutch winter study.',
      },
    ],
    nextStageOnLogicalWin: 6,
    nextStageOnWillpowerWin: 7,
  },
  {
    stageId: 5,
    chapterTitle: 'Chapter 3B: The Scholastic Fortress',
    era: 'Medieval & Renaissance',
    opponentKey: 'AQUINAS',
    opponentName: 'Thomas Aquinas',
    stageBackground: 'The Scholastic Scriptorium',
    matchRuleDescription: 'Aquinas activates super-armor during his Quinque Viae special move, absorbing single strikes.',
    aiDifficulty: 3,
    introDialogue: [
      {
        speaker: 'Thomas Aquinas',
        role: 'opponent',
        expression: 'calm',
        text: 'Every motion requires a First Mover. Every combo requires a sound syllogism. Prepare your defense.',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'Then let my counter-hit serve as the refutation to your Five Ways.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Thomas Aquinas',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'Distinguo—your synthesis of timing and reason is sound. Immanuel Kant awaits your examination in Prussia.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Thomas Aquinas',
        role: 'opponent',
        expression: 'exhausted',
        text: 'Even the heaviest folio yields to relentless force. Seek out Descartes in the Netherlands.',
      },
    ],
    nextStageOnLogicalWin: 6,
    nextStageOnWillpowerWin: 7,
  },
  {
    stageId: 6,
    chapterTitle: 'Chapter 4A: The Clockwork Law of Königsberg',
    era: 'Enlightenment',
    opponentKey: 'KANT',
    opponentName: 'Immanuel Kant',
    stageBackground: 'The Streets of Königsberg',
    matchRuleDescription: 'Categorical Imperative: Do not repeat the same attack button twice in a row while debuffed, or you will take moral-law recoil damage!',
    aiDifficulty: 4,
    specialModifier: 'CATEGORICAL_IMPERATIVE',
    introDialogue: [
      {
        speaker: 'Immanuel Kant',
        role: 'opponent',
        expression: 'intense',
        text: 'Act only according to that combo which you can at the same time will that it should become a universal frame law!',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'calm',
        text: 'Then I shall vary every strike so no maxim is ever spammed.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Immanuel Kant',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'Sublime! Your discipline honours the moral law within. Ascend the Sils-Maria precipice—Friedrich Nietzsche challenges the very foundation of morality.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Immanuel Kant',
        role: 'opponent',
        expression: 'exhausted',
        text: 'Pure reason has met a phenomenon it could not contain. Nietzsche waits on the alpine heights.',
      },
    ],
    nextStageOnLogicalWin: 8,
    nextStageOnWillpowerWin: 8,
  },
  {
    stageId: 7,
    chapterTitle: 'Chapter 4B: Coordinates of Doubt',
    era: 'Enlightenment',
    opponentKey: 'DESCARTES',
    opponentName: 'René Descartes',
    stageBackground: 'The Dutch Winter Study',
    matchRuleDescription: 'Descartes warps across the X-axis using Cartesian coordinates. Watch your rear guard when his meter exceeds 20.',
    aiDifficulty: 4,
    introDialogue: [
      {
        speaker: 'René Descartes',
        role: 'opponent',
        expression: 'smirk',
        text: 'Suppose an evil demon deceives your eyes about my spacing. Only the coordinate plane cannot be doubted!',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'You think, therefore you are within range of my punish.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'René Descartes',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'Q.E.D. Your trajectory calculation was exact. Now climb to Sils-Maria, where Friedrich Nietzsche awaits.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'René Descartes',
        role: 'opponent',
        expression: 'exhausted',
        text: 'My coordinates fractured under your assault. Face Nietzsche at the Alpine precipice!',
      },
    ],
    nextStageOnLogicalWin: 8,
    nextStageOnWillpowerWin: 8,
  },
  {
    stageId: 8,
    chapterTitle: 'Chapter 5: Lightning Over Sils-Maria',
    era: '19th & 20th Century',
    opponentKey: 'NIETZSCHE',
    opponentName: 'Friedrich Nietzsche',
    stageBackground: 'The Sils-Maria Alpine Precipice',
    matchRuleDescription: 'Will to Power: Nietzsche’s damage increases up to +85% as his health drops. Finish him decisively with a Logical Counter to unlock the Secret Final Boss!',
    aiDifficulty: 4,
    specialModifier: 'WILL_TO_POWER',
    introDialogue: [
      {
        speaker: 'Friedrich Nietzsche',
        role: 'opponent',
        expression: 'intense',
        text: 'Man is a rope stretched between beast and Übermensch—a rope over an abyss! That which does not KO me makes my frame data stronger!',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'When you gaze into the arena, the arena gazes back—and it parries on frame one.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Friedrich Nietzsche',
        role: 'opponent',
        expression: 'smirk',
        text: 'Amor Fati! A worthy transvaluation of all combos! You have awakened the final linguistic boundary in Cambridge: Ludwig Wittgenstein!',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Friedrich Nietzsche',
        role: 'opponent',
        expression: 'exhausted',
        text: 'Your Will to Power burned brighter than the storm... Enter the final sanctuary of language and silence.',
      },
    ],
    nextStageOnLogicalWin: 9,
    nextStageOnWillpowerWin: 9,
  },
  {
    stageId: 9,
    chapterTitle: 'Final Chapter: The Limits of Language',
    era: '19th & 20th Century',
    opponentKey: 'WITTGENSTEIN',
    opponentName: 'Ludwig Wittgenstein',
    stageBackground: 'The Cambridge Common Room',
    matchRuleDescription: 'Grand Finale: Wittgenstein deploys Proposition 7 Silence Zones that lock out Special Moves, forcing pure footsies and fundamentals.',
    aiDifficulty: 5,
    specialModifier: 'SILENCE_BOUNDS',
    introDialogue: [
      {
        speaker: 'Ludwig Wittgenstein',
        role: 'opponent',
        expression: 'calm',
        text: 'The limits of my language mean the limits of my world. Most philosophical disputes are merely misunderstandings of frame notation.',
      },
      {
        speaker: 'Challenger',
        role: 'player',
        expression: 'determined',
        text: 'Then let us throw away the ladder after we climb it—one final match for the Logos Crown!',
      },
      {
        speaker: 'Ludwig Wittgenstein',
        role: 'opponent',
        expression: 'intense',
        text: 'Whereof one cannot speak, thereof one must fight in silence.',
      },
    ],
    logicalVictoryOutro: [
      {
        speaker: 'Ludwig Wittgenstein',
        role: 'opponent',
        expression: 'calm',
        text: 'The world is everything that is the case—and today, your mastery of the Logos Arena is indisputable.',
      },
    ],
    willpowerVictoryOutro: [
      {
        speaker: 'Ludwig Wittgenstein',
        role: 'opponent',
        expression: 'thoughtful',
        text: 'The fly has found its way out of the fly-bottle. You stand supreme across twenty-five centuries of thought.',
      },
    ],
    nextStageOnLogicalWin: null,
    nextStageOnWillpowerWin: null,
  },
];

export interface CampaignSaveProgress {
  currentStageId: number;
  completedStageIds: number[];
  logicalWinsCount: number;
  willpowerWinsCount: number;
  unlockedSecretLore: string[];
}

const STORAGE_KEY = 'logos_arena_campaign_v1';

export class StoryCampaignManager {
  public static loadProgress(): CampaignSaveProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore storage error
    }
    return {
      currentStageId: 1,
      completedStageIds: [],
      logicalWinsCount: 0,
      willpowerWinsCount: 0,
      unlockedSecretLore: ['Socrates’ Elenchus Notes'],
    };
  }

  public static saveProgress(progress: CampaignSaveProgress): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage error
    }
  }

  public static resetProgress(): CampaignSaveProgress {
    const fresh: CampaignSaveProgress = {
      currentStageId: 1,
      completedStageIds: [],
      logicalWinsCount: 0,
      willpowerWinsCount: 0,
      unlockedSecretLore: ['Socrates’ Elenchus Notes'],
    };
    this.saveProgress(fresh);
    return fresh;
  }

  public static getStageById(stageId: number): CampaignStage {
    return (
      PHILOSOPHER_CAMPAIGN_GRAPH.find((s) => s.stageId === stageId) ||
      PHILOSOPHER_CAMPAIGN_GRAPH[0]
    );
  }
}
