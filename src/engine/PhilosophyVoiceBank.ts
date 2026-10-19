export interface PhilosopherVoiceProfile {
  pitch: number;
  rate: number;
  langPreference: string[];
  introQuote: string;
  attackQuotes: string[];
  specialQuotes: string[];
  counterQuotes: string[];
  victoryQuotes: string[];
}

export interface ActiveSpeechBubble {
  fighterId: string;
  philosopherKey: string;
  philosopherName: string;
  quote: string;
  category: 'INTRO' | 'ATTACK' | 'SPECIAL' | 'SUPER' | 'VICTORY';
  createdAtMs: number;
  durationMs: number;
}

export const PHILOSOPHY_VOICE_BANK: Record<string, PhilosopherVoiceProfile> = {
  SOCRATES: {
    pitch: 0.84,
    rate: 0.94,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'I know one thing: that I know nothing. Let us examine your thesis!',
    attackQuotes: [
      'The unexamined life is not worth living!',
      'Question your assumptions!',
      'Wisdom begins in wonder!',
      'To find yourself, think for yourself!',
    ],
    specialQuotes: [
      'By the Gadfly of Athens, face your contradiction!',
      'Enter Aporia — your certainty is an illusion!',
      'False words are not only evil in themselves, they infect the soul!',
    ],
    counterQuotes: [
      'Your argument collapses under cross-examination!',
      'When the debate is lost, slander becomes the tool of the loser!',
    ],
    victoryQuotes: [
      'The hour of departure has arrived, and we go our separate ways.',
      'Be kind, for everyone you meet is fighting a hard battle.',
    ],
  },

  PLATO: {
    pitch: 0.88,
    rate: 0.93,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Step out of the Cave and behold the eternal Forms!',
    attackQuotes: [
      'Reality is merely a shadow on the cave wall!',
      'Let no one ignorant of geometry enter here!',
      'Courage is knowing what not to fear!',
      'Time is the moving image of eternity!',
    ],
    specialQuotes: [
      'Behold the Eternal Form of the Good!',
      'Harmony of the Tripartite Soul — Chariot of Reason!',
      'Ideas are the source of all things!',
    ],
    counterQuotes: [
      'You mistake fleeting shadows for eternal truth!',
      'Wise men speak because they have something to say!',
    ],
    victoryQuotes: [
      'The first and greatest victory is to conquer yourself.',
      'Until philosophers rule as kings, cities will never have rest from their evils.',
    ],
  },

  ARISTOTLE: {
    pitch: 0.9,
    rate: 0.97,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Let us proceed by empirical observation and syllogism!',
    attackQuotes: [
      'Excellence is not an act, but a habit!',
      'Strike at the Golden Mean!',
      'Nature does nothing in vain!',
      'Knowing yourself is the beginning of all wisdom!',
    ],
    specialQuotes: [
      'By the Unmoved Prime Mover — Syllogism Complete!',
      'Actuality precedes potentiality!',
      'The whole is greater than the sum of its parts!',
    ],
    counterQuotes: [
      'It is the mark of an educated mind to entertain a thought without accepting it!',
      'Your form lacks a final cause!',
    ],
    victoryQuotes: [
      'We are what we repeatedly do. Excellence, then, is a habit.',
      'Happiness depends upon ourselves — Eudaimonia achieved.',
    ],
  },

  CONFUCIUS: {
    pitch: 0.85,
    rate: 0.91,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Without ritual propriety, strength becomes chaos. Observe Li!',
    attackQuotes: [
      'Respect yourself and others will respect you!',
      'The superior person acts before speaking!',
      'To see what is right and not do it is want of courage!',
      'Everything has beauty, but not everyone sees it!',
    ],
    specialQuotes: [
      'Mandate of Heaven — Harmony of the Five Classics!',
      'By Ren and Li, order is restored to the realm!',
      'Do not impose on others what you yourself do not desire!',
    ],
    counterQuotes: [
      'Real knowledge is to know the extent of one’s ignorance!',
      'He who conquers himself is the mightiest warrior!',
    ],
    victoryQuotes: [
      'It does not matter how slowly you go as long as you do not stop.',
      'Our greatest glory is not in never falling, but in rising every time we fall.',
    ],
  },

  LAOZI: {
    pitch: 0.82,
    rate: 0.88,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'The Tao that can be spoken is not the eternal Tao.',
    attackQuotes: [
      'Water is fluid and yielding, yet overcomes solid rock!',
      'Act without expectation — Wu Wei!',
      'Nature does not hurry, yet everything is accomplished!',
      'Softness triumphs over hardness!',
    ],
    specialQuotes: [
      'Flow of the Eternal Tao — Yin and Yang in one breath!',
      'By doing nothing, nothing is left undone!',
      'Return to the Uncarved Block!',
    ],
    counterQuotes: [
      'A good fighter is never angry!',
      'When you let go of what you are, you become what you might be!',
    ],
    victoryQuotes: [
      'Knowing others is intelligence; knowing yourself is true wisdom.',
      'A journey of a thousand miles begins with a single step.',
    ],
  },

  EPICURUS: {
    pitch: 0.92,
    rate: 0.95,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Banish fear and trouble — enter the Garden of Ataraxia!',
    attackQuotes: [
      'Nothing is enough for the man to whom enough is too little!',
      'Atoms swerve through the infinite void!',
      'Do not spoil what you have by desiring what you have not!',
      'Peace of mind is the highest good!',
    ],
    specialQuotes: [
      'Tetrapharmakos — Tranquility of the Soul!',
      'Death is nothing to us! Where we are, death is not!',
      'Clinamen Atomic Swerve!',
    ],
    counterQuotes: [
      'The greater the difficulty, the more glory in surmounting it!',
      'Your anxiety betrays your lack of philosophy!',
    ],
    victoryQuotes: [
      'Of all the things which wisdom provides to make life entirely happy, much the greatest is friendship.',
      'Ataraxia is complete: a body free from pain and a mind free from perturbation.',
    ],
  },

  AUGUSTINE: {
    pitch: 0.86,
    rate: 0.92,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Our hearts are restless until they find their rest in truth!',
    attackQuotes: [
      'Truth is like a lion; set it free and it will defend itself!',
      'Right is right even if no one is doing it!',
      'Love, and do what you will!',
      'What then is time? If no one asks me, I know!',
    ],
    specialQuotes: [
      'City of God — Illumination of Grace!',
      'Faith is to believe what you do not see!',
      'Conquer the divided will within!',
    ],
    counterQuotes: [
      'Patience is the companion of wisdom!',
      'Pride is the commencement of all sin!',
    ],
    victoryQuotes: [
      'The world is a book, and those who do not travel read only a page.',
      'Give me chastity and continence — and victory in the arena of spirit.',
    ],
  },

  AQUINAS: {
    pitch: 0.8,
    rate: 0.9,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Faith and Reason stand united! Behold the Summa Theologiae!',
    attackQuotes: [
      'Beware the man of a single book!',
      'To one who has faith, no explanation is necessary!',
      'Grace does not destroy nature, but perfects it!',
      'Every effect demands a cause!',
    ],
    specialQuotes: [
      'Quinque Viae — The Five Ways of Demonstration!',
      'Angelic Doctor’s Scholastic Bastion!',
      'Reason illuminates the natural law!',
    ],
    counterQuotes: [
      'I respond that your premise is refuted: Sed Contra!',
      'Sorrow can be alleviated by good sleep and sound logic!',
    ],
    victoryQuotes: [
      'The things that we love tell us what we are.',
      'Better to illuminate than merely to shine.',
    ],
  },

  MACHIAVELLI: {
    pitch: 0.96,
    rate: 1.03,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'In the arena of power, one must be both the Lion and the Fox!',
    attackQuotes: [
      'It is safer to be feared than loved!',
      'Never attempt to win by force what can be won by deception!',
      'Fortune favors the bold — Virtù conquers Fortuna!',
      'Unarmed prophets always fall!',
    ],
    specialQuotes: [
      'Florentine Realpolitik — The Ends Justify the Means!',
      'The Lion terrifies the wolves; the Fox recognizes the traps!',
      'Strike decisively so no vengeance can follow!',
    ],
    counterQuotes: [
      'Men judge more by the eye than by the hand!',
      'Never waste an opportunity born of crisis!',
    ],
    victoryQuotes: [
      'Where the willingness is great, the difficulties cannot be great.',
      'Politics have no relation to morals — victory belongs to the Prince.',
    ],
  },

  DESCARTES: {
    pitch: 0.95,
    rate: 1.0,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Doubt everything until only indubitable geometry remains!',
    attackQuotes: [
      'Cogito, ergo sum — I think, therefore I am!',
      'Divide each difficulty into as many parts as is feasible!',
      'Good sense is the most evenly shared thing in the world!',
      'Conquer yourself rather than the world!',
    ],
    specialQuotes: [
      'Cartesian Coordinate Warp — Origin Point Zero!',
      'Not even the Evil Demon can deceive clear and distinct perception!',
      'Mind and Extension converge at the Pineal Nexus!',
    ],
    counterQuotes: [
      'Your senses deceive you at these coordinates!',
      'It is not enough to have a good mind; the main thing is to use it well!',
    ],
    victoryQuotes: [
      'I think, therefore I am — and your hypothesis has been falsified.',
      'The reading of all good books is like a conversation with the finest minds.',
    ],
  },

  SPINOZA: {
    pitch: 0.89,
    rate: 0.93,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Deus sive Natura — God and Nature are one infinite substance!',
    attackQuotes: [
      'Do not weep; do not wax indignant. Understand!',
      'All things excellent are as difficult as they are rare!',
      'Peace is not an absence of war, it is a virtue!',
      'Every being strives to persevere in its own existence — Conatus!',
    ],
    specialQuotes: [
      'Sub Specie Aeternitatis — Under the Aspect of Eternity!',
      'Ethics Demonstrated in Geometrical Order — Q.E.D.!',
      'Infinite Modes of One Substance!',
    ],
    counterQuotes: [
      'Men believe themselves free only because they are ignorant of the causes!',
      'Emotion which is a passion ceases to be a passion as soon as we form a clear idea of it!',
    ],
    victoryQuotes: [
      'The highest activity a human being can attain is learning for understanding.',
      'All things excellent are as difficult as they are rare.',
    ],
  },

  LOCKE: {
    pitch: 0.91,
    rate: 0.96,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'The mind begins as a Tabula Rasa — experience writes the verdict!',
    attackQuotes: [
      'Life, Liberty, and Property!',
      'No man’s knowledge here can go beyond his experience!',
      'Where there is no law, there is no freedom!',
      'New opinions are always suspected without any other reason!',
    ],
    specialQuotes: [
      'Sovereign Social Contract — Natural Rights Enforced!',
      'By the labor of my hands, this ground is my property!',
      'Consent of the Governed — Appeal to Heaven!',
    ],
    counterQuotes: [
      'Revolt is the right of the people when tyranny infringes this boundary!',
      'Every man has a property in his own person!',
    ],
    victoryQuotes: [
      'Being all equal and independent, no one ought to harm another in his life, health, liberty, or possessions.',
      'Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours.',
    ],
  },

  HUME: {
    pitch: 0.94,
    rate: 1.0,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Reason is, and ought only to be, the slave of the passions!',
    attackQuotes: [
      'Custom is the great guide of human life!',
      'A wise man proportions his belief to the evidence!',
      'Beauty in things exists in the mind which contemplates them!',
      'You cannot derive an ought from an is!',
    ],
    specialQuotes: [
      'Fork of Hume — Commit Sophistry and Illusion to the Flames!',
      'Causation is nothing more than constant conjunction!',
      'Skeptical Billiard-Ball Impulse!',
    ],
    counterQuotes: [
      'Just because your last strike hit does not prove the next one will!',
      'The life of man is of no greater importance to the universe than that of an oyster!',
    ],
    victoryQuotes: [
      'Be a philosopher; but, amidst all your philosophy, be still a man.',
      'Generally speaking, the errors in religion are dangerous; those in philosophy only ridiculous.',
    ],
  },

  ROUSSEAU: {
    pitch: 0.93,
    rate: 0.98,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Man is born free, and everywhere he is in chains — break them!',
    attackQuotes: [
      'Listen to the voice of nature within!',
      'Patience is bitter, but its fruit is sweet!',
      'People who know little are usually great talkers!',
      'The world of reality has its limits; the world of imagination is boundless!',
    ],
    specialQuotes: [
      'Sovereign General Will — Chains Shattered!',
      'Force does not constitute right!',
      'Whoever refuses to obey the General Will shall be forced to be free!',
    ],
    counterQuotes: [
      'Civilized conventions cannot bind natural passion!',
      'To write a good love letter, you ought to begin without knowing what you mean to say!',
    ],
    victoryQuotes: [
      'Man is born free, and today the chains of dogma lie broken.',
      'Free peoples, remember this maxim: we may acquire liberty, but it is never recovered if it is once lost.',
    ],
  },

  KANT: {
    pitch: 0.87,
    rate: 0.95,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Sapere aude! Have the courage to use your own understanding!',
    attackQuotes: [
      'Thoughts without content are empty; intuitions without concepts are blind!',
      'Treat humanity always as an end, never merely as a means!',
      'Out of the crooked timber of humanity, no straight thing was ever made!',
      'Science is organized knowledge; wisdom is organized life!',
    ],
    specialQuotes: [
      'Categorical Imperative — Act only on a universalizable maxim!',
      'Critique of Pure Reason — Synthetic A Priori Judgment!',
      'The starry heavens above me and the moral law within me!',
    ],
    counterQuotes: [
      'Your maxim contradicts itself when made universal law!',
      'Duty is the necessity of acting from respect for the moral law!',
    ],
    victoryQuotes: [
      'Two things fill the mind with ever new admiration and awe: the starry heavens above me and the moral law within me.',
      'Enlightenment is man’s emergence from his self-imposed immaturity.',
    ],
  },

  HEGEL: {
    pitch: 0.83,
    rate: 0.92,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'History is the march of Absolute Spirit! Thesis meets Antithesis!',
    attackQuotes: [
      'What is rational is actual, and what is actual is rational!',
      'Nothing great in the world has ever been accomplished without passion!',
      'Genuine tragedy is a conflict between two rights!',
      'Negation is the engine of becoming!',
    ],
    specialQuotes: [
      'Dialectical Aufhebung — Thesis, Antithesis, Synthesis!',
      'World-Spirit on Horseback — Phenomenology of Spirit!',
      'Master-Slave Dialectic Reversal!',
    ],
    counterQuotes: [
      'Your attack is sublated into a higher synthesis!',
      'The history of the world is none other than the progress of the consciousness of freedom!',
    ],
    victoryQuotes: [
      'The owl of Minerva spreads its wings only with the falling of the dusk.',
      'We learn from history that we do not learn from history.',
    ],
  },

  MARX: {
    pitch: 0.81,
    rate: 0.96,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Philosophers have only interpreted the world; the point is to change it!',
    attackQuotes: [
      'Workers of the world, unite!',
      'History repeats itself, first as tragedy, second as farce!',
      'The history of all hitherto existing society is the history of class struggles!',
      'Reclaim the surplus value of labor!',
    ],
    specialQuotes: [
      'Historical Materialism — Expropriate the Expropriators!',
      'A spectre is haunting this arena!',
      'All that is solid melts into air!',
    ],
    counterQuotes: [
      'Your bourgeois guard crumbles under material contradictions!',
      'The ruling ideas of each age have ever been the ideas of its ruling class!',
    ],
    victoryQuotes: [
      'The proletarians have nothing to lose but their chains. They have a world to win.',
      'Philosophers have hitherto only interpreted the world in various ways; the point is to change it.',
    ],
  },

  NIETZSCHE: {
    pitch: 0.82,
    rate: 0.98,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Man is a rope stretched between beast and Übermensch — over an abyss!',
    attackQuotes: [
      'That which does not kill us makes us stronger!',
      'Become who you are!',
      'He who has a why to live can bear almost any how!',
      'Without music, life would be a mistake!',
    ],
    specialQuotes: [
      'Thus Spoke Zarathustra — Will to Power Unleashed!',
      'Philosophize with a Hammer — Twilight of the Idols!',
      'Amor Fati — Eternal Recurrence of the Same!',
    ],
    counterQuotes: [
      'When you gaze long into an abyss, the abyss also gazes into you!',
      'One must still have chaos in oneself to be able to give birth to a dancing star!',
    ],
    victoryQuotes: [
      'He who fights with monsters might take care lest he thereby become a monster.',
      'There are no facts, only interpretations — and my Will to Power prevails.',
    ],
  },

  KIERKEGAARD: {
    pitch: 0.92,
    rate: 0.96,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Anxiety is the dizziness of freedom! Take the Leap of Faith!',
    attackQuotes: [
      'Life can only be understood backwards, but it must be lived forwards!',
      'To dare is to lose one’s footing momentarily!',
      'Truth is subjectivity!',
      'The tyrant dies and his rule is over; the martyr dies and his rule begins!',
    ],
    specialQuotes: [
      'Knight of Faith — Leap Across the Infinite Abyss!',
      'Either/Or — Teleological Suspension of the Ethical!',
      'Purity of heart is to will one thing!',
    ],
    counterQuotes: [
      'Not to dare is to lose oneself!',
      'People demand freedom of speech as a compensation for the freedom of thought which they seldom use!',
    ],
    victoryQuotes: [
      'Anxiety is the dizziness of freedom, and through faith the spirit stands whole.',
      'The most common form of despair is not being who you are.',
    ],
  },

  WITTGENSTEIN: {
    pitch: 0.93,
    rate: 1.01,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'The limits of my language mean the limits of my world!',
    attackQuotes: [
      'Meaning is use in the language-game!',
      'Philosophy is a battle against the bewitchment of our intelligence by means of language!',
      'The world is everything that is the case!',
      'Don’t think, but look!',
    ],
    specialQuotes: [
      'Proposition Seven — Whereof one cannot speak, thereof one must be silent!',
      'Throw away the ladder after you have climbed up it!',
      'Show the fly the way out of the fly-bottle!',
    ],
    counterQuotes: [
      'A nothing would serve just as well as a something about which nothing could be said!',
      'Your move violates the grammar of this language-game!',
    ],
    victoryQuotes: [
      'Whereof one cannot speak, thereof one must be silent.',
      'If people never did silly things, nothing intelligent would ever get done.',
    ],
  },

  SARTRE: {
    pitch: 0.94,
    rate: 1.02,
    langPreference: ['en-GB', 'en-US'],
    introQuote: 'Existence precedes essence! We are condemned to be free!',
    attackQuotes: [
      'Man is nothing else but that which he makes of himself!',
      'Freedom is what you do with what’s been done to you!',
      'Every existing thing is born without reason!',
      'Cast off your Bad Faith!',
    ],
    specialQuotes: [
      'Being and Nothingness — The Radical Gaze of the Other!',
      'No Exit — Hell is other people!',
      'In anguish, you choose your own destiny!',
    ],
    counterQuotes: [
      'Refusing to choose is still a choice!',
      'You cannot hide behind deterministic excuses!',
    ],
    victoryQuotes: [
      'Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.',
      'Existence precedes essence — and my choice has defined this arena.',
    ],
  },
};
