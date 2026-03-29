/**
 * wordBanks.ts — Curated educational content for all 8 Games Arcade games
 * Grades K–8, across levels 1–100.
 */

// ── Rhyme Time ────────────────────────────────────────────────────────────────
export interface RhymePair {
  word: string
  rhyme: string
  distractors: string[]
  grade: number
}

export const RHYME_BANKS: Record<number, RhymePair[]> = {
  0: [
    { word:'cat',   rhyme:'hat',  distractors:['dog','sun','big'],      grade:0 },
    { word:'dog',   rhyme:'log',  distractors:['cat','run','top'],      grade:0 },
    { word:'sun',   rhyme:'run',  distractors:['dog','hat','sit'],      grade:0 },
    { word:'hop',   rhyme:'top',  distractors:['run','big','dog'],      grade:0 },
    { word:'bed',   rhyme:'red',  distractors:['hop','cat','fun'],      grade:0 },
    { word:'sit',   rhyme:'hit',  distractors:['bed','top','sun'],      grade:0 },
    { word:'big',   rhyme:'pig',  distractors:['sit','run','hat'],      grade:0 },
    { word:'fun',   rhyme:'bun',  distractors:['big','red','hop'],      grade:0 },
    { word:'map',   rhyme:'cap',  distractors:['fun','sit','log'],      grade:0 },
    { word:'wet',   rhyme:'net',  distractors:['map','pig','top'],      grade:0 },
    { word:'hot',   rhyme:'pot',  distractors:['wet','big','run'],      grade:0 },
    { word:'bug',   rhyme:'mug',  distractors:['hot','cap','bed'],      grade:0 },
  ],
  1: [
    { word:'night',  rhyme:'light',   distractors:['great','thing','small'],   grade:1 },
    { word:'rain',   rhyme:'train',   distractors:['night','play','fog'],      grade:1 },
    { word:'play',   rhyme:'day',     distractors:['rain','light','fog'],      grade:1 },
    { word:'ball',   rhyme:'call',    distractors:['play','train','sun'],      grade:1 },
    { word:'tree',   rhyme:'bee',     distractors:['ball','rain','hop'],       grade:1 },
    { word:'cake',   rhyme:'lake',    distractors:['tree','call','night'],     grade:1 },
    { word:'grow',   rhyme:'snow',    distractors:['cake','bee','ball'],       grade:1 },
    { word:'blue',   rhyme:'true',    distractors:['grow','lake','tree'],      grade:1 },
    { word:'feet',   rhyme:'meet',    distractors:['blue','snow','call'],      grade:1 },
    { word:'bring',  rhyme:'sing',    distractors:['feet','true','grow'],      grade:1 },
    { word:'shell',  rhyme:'tell',    distractors:['bring','meet','blue'],     grade:1 },
    { word:'street', rhyme:'sweet',   distractors:['shell','sing','snow'],     grade:1 },
  ],
  2: [
    { word:'bright',   rhyme:'night',      distractors:['cloud','under','jump'],       grade:2 },
    { word:'round',    rhyme:'sound',      distractors:['silver','build','drop'],      grade:2 },
    { word:'flower',   rhyme:'power',      distractors:['basket','friend','stone'],    grade:2 },
    { word:'mouse',    rhyme:'house',      distractors:['pencil','green','water'],     grade:2 },
    { word:'storm',    rhyme:'warm',       distractors:['purple','glass','funny'],     grade:2 },
    { word:'think',    rhyme:'drink',      distractors:['orange','brave','forest'],    grade:2 },
    { word:'catch',    rhyme:'match',      distractors:['dream','pillow','branch'],    grade:2 },
    { word:'brave',    rhyme:'cave',       distractors:['lunch','ready','storm'],      grade:2 },
    { word:'knew',     rhyme:'flew',       distractors:['blanket','round','splash'],   grade:2 },
    { word:'chase',    rhyme:'space',      distractors:['winter','funny','bridge'],    grade:2 },
    { word:'drown',    rhyme:'crown',      distractors:['silver','happy','truck'],     grade:2 },
    { word:'groan',    rhyme:'throne',     distractors:['purple','cotton','river'],    grade:2 },
  ],
  3: [
    { word:'autumn',   rhyme:'fathom',     distractors:['center','purple','window'],   grade:3 },
    { word:'dangle',   rhyme:'mangle',     distractors:['forest','basket','thunder'],  grade:3 },
    { word:'motion',   rhyme:'ocean',      distractors:['winter','pencil','ladder'],   grade:3 },
    { word:'humble',   rhyme:'tumble',     distractors:['orange','planet','mirror'],   grade:3 },
    { word:'thunder',  rhyme:'wonder',     distractors:['candle','bottle','travel'],   grade:3 },
    { word:'station',  rhyme:'nation',     distractors:['window','corner','carpet'],   grade:3 },
    { word:'slumber',  rhyme:'number',     distractors:['blanket','finish','weather'], grade:3 },
    { word:'shallow',  rhyme:'fallow',     distractors:['purple','garden','plastic'],  grade:3 },
    { word:'border',   rhyme:'order',      distractors:['candle','silver','gentle'],   grade:3 },
    { word:'mention',  rhyme:'tension',    distractors:['window','puddle','donkey'],   grade:3 },
    { word:'venture',  rhyme:'adventure',  distractors:['plastic','blanket','frozen'], grade:3 },
    { word:'cluster',  rhyme:'bluster',    distractors:['candle','million','pepper'],  grade:3 },
  ],
  4: [
    { word:'ambition',   rhyme:'edition',    distractors:['blanket','current','distant'],  grade:4 },
    { word:'culture',    rhyme:'vulture',    distractors:['fiction','modern','captain'],   grade:4 },
    { word:'certain',    rhyme:'curtain',    distractors:['venture','marble','lantern'],   grade:4 },
    { word:'inspire',    rhyme:'acquire',    distractors:['golden','candle','ribbon'],     grade:4 },
    { word:'mention',    rhyme:'invention',  distractors:['cotton','silver','button'],     grade:4 },
    { word:'ancient',    rhyme:'patient',    distractors:['bucket','fossil','legend'],     grade:4 },
    { word:'fraction',   rhyme:'action',     distractors:['window','marble','bucket'],     grade:4 },
    { word:'replace',    rhyme:'embrace',    distractors:['frozen','random','garden'],     grade:4 },
    { word:'comply',     rhyme:'supply',     distractors:['garden','thunder','cotton'],    grade:4 },
    { word:'motion',     rhyme:'devotion',   distractors:['carpet','button','ribbon'],     grade:4 },
    { word:'feature',    rhyme:'creature',   distractors:['blanket','window','pencil'],    grade:4 },
    { word:'retire',     rhyme:'entire',     distractors:['captain','modern','cotton'],    grade:4 },
  ],
  5: [
    { word:'illusion',   rhyme:'confusion',  distractors:['blanket','standard','crimson'],  grade:5 },
    { word:'profound',   rhyme:'renowned',   distractors:['shelter','captain','marble'],    grade:5 },
    { word:'sensation',  rhyme:'imagination',distractors:['crumble','lantern','pilgrim'],   grade:5 },
    { word:'dimension',  rhyme:'comprehension',distractors:['copper','burden','anthem'],    grade:5 },
    { word:'pursuit',    rhyme:'tribute',    distractors:['shadow','gravel','mirror'],      grade:5 },
    { word:'sincere',    rhyme:'atmosphere', distractors:['blanket','candle','cotton'],     grade:5 },
    { word:'abstract',   rhyme:'attract',    distractors:['shelter','nimble','frozen'],     grade:5 },
    { word:'ancient',    rhyme:'omniscient', distractors:['random','copper','marvel'],      grade:5 },
    { word:'transmit',   rhyme:'counterfeit',distractors:['garden','burden','pillow'],      grade:5 },
    { word:'prevail',    rhyme:'exhale',     distractors:['bitter','copper','shelter'],     grade:5 },
    { word:'ignite',     rhyme:'expedite',   distractors:['cotton','marble','candle'],      grade:5 },
    { word:'sublime',    rhyme:'paradigm',   distractors:['shelter','copper','random'],     grade:5 },
  ],
  6: [
    { word:'rhetoric',   rhyme:'atmospheric',distractors:['sterling','burden','crimson'],   grade:6 },
    { word:'eloquence',  rhyme:'benevolence',distractors:['gravel','shelter','copper'],     grade:6 },
    { word:'irony',      rhyme:'harmony',    distractors:['sterling','random','candle'],    grade:6 },
    { word:'metaphor',   rhyme:'therefore',  distractors:['copper','shelter','burden'],     grade:6 },
    { word:'allegory',   rhyme:'category',   distractors:['crimson','marble','cotton'],     grade:6 },
    { word:'narrate',    rhyme:'elaborate',  distractors:['shadow','pilgrim','shelter'],    grade:6 },
    { word:'premise',    rhyme:'nemesis',    distractors:['cotton','gravel','random'],      grade:6 },
    { word:'conflict',   rhyme:'predict',    distractors:['marble','burden','lantern'],     grade:6 },
    { word:'contrast',   rhyme:'forecast',   distractors:['shelter','copper','candle'],     grade:6 },
    { word:'debate',     rhyme:'contemplate',distractors:['cotton','crimson','gravel'],     grade:6 },
    { word:'symbol',     rhyme:'nimble',     distractors:['burden','shelter','random'],     grade:6 },
    { word:'structure',  rhyme:'rupture',    distractors:['cotton','marble','copper'],      grade:6 },
  ],
  7: [
    { word:'synthesis',  rhyme:'nemesis',    distractors:['sterling','candle','burden'],    grade:7 },
    { word:'epitome',    rhyme:'autonomy',   distractors:['copper','shelter','random'],     grade:7 },
    { word:'paradox',    rhyme:'orthodox',   distractors:['marble','cotton','crimson'],     grade:7 },
    { word:'imply',      rhyme:'exemplify',  distractors:['shelter','burden','lantern'],    grade:7 },
    { word:'conjecture', rhyme:'ecture',     distractors:['copper','random','marble'],      grade:7 },
    { word:'analogy',    rhyme:'apology',    distractors:['crimson','candle','shelter'],    grade:7 },
    { word:'oppression', rhyme:'expression', distractors:['cotton','gravel','burden'],      grade:7 },
    { word:'desolate',   rhyme:'isolate',    distractors:['copper','marble','random'],      grade:7 },
    { word:'hypocrite',  rhyme:'counterfeit',distractors:['shelter','burden','crimson'],    grade:7 },
    { word:'ambiguity',  rhyme:'continuity', distractors:['cotton','marble','candle'],      grade:7 },
    { word:'lucid',      rhyme:'fluid',      distractors:['copper','random','shelter'],     grade:7 },
    { word:'persist',    rhyme:'coexist',    distractors:['marble','burden','crimson'],     grade:7 },
  ],
  8: [
    { word:'soliloquy',  rhyme:'obloquy',    distractors:['copper','sterling','shelter'],   grade:8 },
    { word:'ephemeral',  rhyme:'peripheral', distractors:['burden','crimson','random'],     grade:8 },
    { word:'equivocal',  rhyme:'reciprocal', distractors:['marble','cotton','candle'],      grade:8 },
    { word:'hegemony',   rhyme:'autonomy',   distractors:['shelter','copper','burden'],     grade:8 },
    { word:'perfidious', rhyme:'insidious',  distractors:['crimson','marble','random'],     grade:8 },
    { word:'juxtapose',  rhyme:'verbose',    distractors:['cotton','candle','gravel'],      grade:8 },
    { word:'acrimony',   rhyme:'ceremony',   distractors:['shelter','copper','burden'],     grade:8 },
    { word:'magnanimous',rhyme:'unanimous',  distractors:['marble','crimson','random'],     grade:8 },
    { word:'obstinate',  rhyme:'fortunate',  distractors:['copper','candle','shelter'],     grade:8 },
    { word:'laconic',    rhyme:'ironic',     distractors:['burden','marble','cotton'],      grade:8 },
    { word:'dissonance', rhyme:'resonance',  distractors:['crimson','random','copper'],     grade:8 },
    { word:'omniscient', rhyme:'sufficient', distractors:['marble','burden','shelter'],     grade:8 },
  ],
}


// ── Sentence Builder ──────────────────────────────────────────────────────────
export interface SentenceItem {
  words: string[]   // in order
  grade: number
  level: number     // 1=easy, 2=medium, 3=hard
}

export const SENTENCE_BANKS: SentenceItem[] = [
  // Grade K
  { words:['The','cat','sat.'],                        grade:0, level:1 },
  { words:['I','can','run.'],                          grade:0, level:1 },
  { words:['See','the','big','dog.'],                  grade:0, level:1 },
  { words:['The','sun','is','hot.'],                   grade:0, level:1 },
  { words:['I','see','a','red','ball.'],               grade:0, level:2 },
  { words:['The','dog','can','hop','up.'],             grade:0, level:2 },
  // Grade 1
  { words:['The','little','bird','flew','away.'],       grade:1, level:1 },
  { words:['She','ran','to','the','big','tree.'],       grade:1, level:1 },
  { words:['We','can','play','in','the','rain.'],       grade:1, level:1 },
  { words:['He','has','a','blue','ball','and','a','hat.'], grade:1, level:2 },
  { words:['The','happy','dog','jumped','over','the','log.'], grade:1, level:2 },
  { words:['My','mom','baked','a','sweet','cake','today.'],   grade:1, level:2 },
  // Grade 2
  { words:['The','old','turtle','walked','slowly','down','the','path.'],      grade:2, level:1 },
  { words:['She','found','a','shiny','coin','near','the','lake.'],           grade:2, level:1 },
  { words:['The','brave','knight','rode','his','horse','into','the','forest.'], grade:2, level:2 },
  { words:['We','looked','up','and','saw','a','rainbow','after','the','storm.'], grade:2, level:2 },
  // Grade 3
  { words:['The','curious','explorer','discovered','a','hidden','path','in','the','jungle.'], grade:3, level:1 },
  { words:['Although','it','was','raining,','the','children','decided','to','play','outside.'], grade:3, level:2 },
  { words:['The','ancient','lighthouse','guided','ships','safely','through','the','dark','waters.'], grade:3, level:2 },
  // Grade 4
  { words:['After','completing','her','homework,','Maria','read','her','favorite','mystery','novel.'], grade:4, level:1 },
  { words:['The','scientist','carefully','recorded','her','observations','in','a','leather-bound','journal.'], grade:4, level:2 },
  // Grade 5
  { words:['Despite','the','fierce','competition,','the','team','remained','calm','and','focused','on','their','strategy.'], grade:5, level:1 },
  { words:['The','ancient','Egyptians','constructed','enormous','pyramids','that','have','amazed','people','for','thousands','of','years.'], grade:5, level:2 },
  // Grade 6
  { words:['Consequently,','the','researchers','concluded','that','further','investigation','was','necessary','to','validate','their','initial','hypothesis.'], grade:6, level:1 },
  // Grade 7
  { words:['The','protagonist\'s','internal','conflict','between','loyalty','and','ambition','drives','the','novel\'s','central','narrative','arc.'], grade:7, level:1 },
  // Grade 8
  { words:['Environmental','degradation,','exacerbated','by','industrialization,','necessitates','immediate','and','comprehensive','policy','reform','at','every','governmental','level.'], grade:8, level:1 },
]

// ── Synonym Showdown ──────────────────────────────────────────────────────────
export interface SynonymItem {
  word: string
  type: 'synonym' | 'antonym'
  correct: string
  choices: string[]
  grade: number
}

export const SYNONYM_BANKS: SynonymItem[] = [
  // Grade 2-3
  { word:'happy',      type:'synonym', correct:'glad',       choices:['glad','sad','angry','tired'],                     grade:2 },
  { word:'big',        type:'synonym', correct:'large',      choices:['large','tiny','dark','quick'],                    grade:2 },
  { word:'fast',       type:'antonym', correct:'slow',       choices:['slow','quick','speedy','swift'],                  grade:2 },
  { word:'cold',       type:'antonym', correct:'hot',        choices:['hot','chilly','icy','frozen'],                    grade:2 },
  { word:'brave',      type:'synonym', correct:'bold',       choices:['bold','scared','tired','little'],                 grade:2 },
  { word:'sad',        type:'antonym', correct:'happy',      choices:['happy','gloomy','tearful','upset'],               grade:2 },
  { word:'begin',      type:'synonym', correct:'start',      choices:['start','end','finish','stop'],                    grade:3 },
  { word:'shout',      type:'synonym', correct:'yell',       choices:['yell','whisper','sit','skip'],                    grade:3 },
  { word:'dark',       type:'antonym', correct:'bright',     choices:['bright','gloomy','dim','grey'],                   grade:3 },
  { word:'tiny',       type:'synonym', correct:'small',      choices:['small','huge','vast','giant'],                    grade:3 },
  // Grade 4
  { word:'ancient',    type:'synonym', correct:'old',        choices:['old','modern','new','recent'],                    grade:4 },
  { word:'weary',      type:'synonym', correct:'tired',      choices:['tired','eager','strong','quick'],                 grade:4 },
  { word:'assist',     type:'synonym', correct:'help',       choices:['help','hinder','block','confuse'],                grade:4 },
  { word:'tranquil',   type:'synonym', correct:'calm',       choices:['calm','loud','stormy','chaotic'],                 grade:4 },
  { word:'demolish',   type:'synonym', correct:'destroy',    choices:['destroy','build','repair','restore'],             grade:4 },
  { word:'scarce',     type:'antonym', correct:'abundant',   choices:['abundant','rare','limited','few'],                grade:4 },
  { word:'timid',      type:'antonym', correct:'bold',       choices:['bold','nervous','shy','quiet'],                   grade:4 },
  { word:'swift',      type:'synonym', correct:'rapid',      choices:['rapid','sluggish','slow','gentle'],               grade:4 },
  // Grade 5
  { word:'expand',     type:'antonym', correct:'shrink',     choices:['shrink','grow','stretch','widen'],                grade:5 },
  { word:'gracious',   type:'synonym', correct:'kind',       choices:['kind','rude','cold','harsh'],                     grade:5 },
  { word:'foe',        type:'synonym', correct:'enemy',      choices:['enemy','friend','ally','partner'],                grade:5 },
  { word:'conceal',    type:'antonym', correct:'reveal',     choices:['reveal','hide','cover','mask'],                   grade:5 },
  { word:'diligent',   type:'synonym', correct:'hardworking',choices:['hardworking','lazy','careless','rushed'],         grade:5 },
  { word:'flourish',   type:'antonym', correct:'wither',     choices:['wither','thrive','bloom','grow'],                 grade:5 },
  { word:'vivid',      type:'synonym', correct:'vibrant',    choices:['vibrant','dull','pale','faded'],                  grade:5 },
  { word:'obstruct',   type:'synonym', correct:'block',      choices:['block','allow','permit','enable'],                grade:5 },
  // Grade 6
  { word:'lucid',      type:'synonym', correct:'clear',      choices:['clear','murky','vague','cloudy'],                 grade:6 },
  { word:'benign',     type:'antonym', correct:'harmful',    choices:['harmful','kind','gentle','safe'],                 grade:6 },
  { word:'verbose',    type:'synonym', correct:'wordy',      choices:['wordy','brief','concise','short'],                grade:6 },
  { word:'malevolent', type:'antonym', correct:'benevolent', choices:['benevolent','cruel','wicked','hostile'],          grade:6 },
  { word:'insolent',   type:'synonym', correct:'rude',       choices:['rude','polite','humble','respectful'],            grade:6 },
  { word:'prudent',    type:'antonym', correct:'reckless',   choices:['reckless','careful','wise','cautious'],           grade:6 },
  { word:'superficial',type:'antonym', correct:'profound',   choices:['profound','shallow','vain','trivial'],            grade:6 },
  { word:'lament',     type:'synonym', correct:'mourn',      choices:['mourn','celebrate','cheer','praise'],             grade:6 },
  // Grade 7
  { word:'adamant',    type:'synonym', correct:'firm',       choices:['firm','flexible','unsure','wavering'],            grade:7 },
  { word:'placid',     type:'synonym', correct:'calm',       choices:['calm','turbulent','excited','fierce'],            grade:7 },
  { word:'loquacious', type:'antonym', correct:'taciturn',   choices:['taciturn','talkative','verbose','chatty'],        grade:7 },
  { word:'copious',    type:'antonym', correct:'meager',     choices:['meager','plentiful','abundant','generous'],       grade:7 },
  { word:'ostentatious',type:'synonym',correct:'showy',      choices:['showy','modest','humble','reserved'],             grade:7 },
  { word:'alleviate',  type:'synonym', correct:'relieve',    choices:['relieve','worsen','intensify','aggravate'],       grade:7 },
  { word:'dogmatic',   type:'antonym', correct:'open-minded',choices:['open-minded','rigid','stubborn','biased'],        grade:7 },
  { word:'insipid',    type:'synonym', correct:'bland',      choices:['bland','flavorful','exciting','vivid'],           grade:7 },
  // Grade 8
  { word:'ephemeral',  type:'antonym', correct:'enduring',   choices:['enduring','fleeting','brief','transient'],        grade:8 },
  { word:'esoteric',   type:'synonym', correct:'obscure',    choices:['obscure','popular','common','mainstream'],        grade:8 },
  { word:'equivocal',  type:'antonym', correct:'unambiguous',choices:['unambiguous','vague','unclear','ambiguous'],      grade:8 },
  { word:'sycophant',  type:'synonym', correct:'flatterer',  choices:['flatterer','critic','opponent','reformer'],       grade:8 },
  { word:'mendacious', type:'antonym', correct:'truthful',   choices:['truthful','dishonest','deceitful','false'],       grade:8 },
  { word:'intrepid',   type:'synonym', correct:'fearless',   choices:['fearless','timid','fearful','hesitant'],          grade:8 },
  { word:'impetuous',  type:'antonym', correct:'deliberate', choices:['deliberate','rash','hasty','careless'],           grade:8 },
  { word:'perfidious', type:'synonym', correct:'treacherous',choices:['treacherous','loyal','faithful','trustworthy'],   grade:8 },
]

// ── Vocabulary Vault ──────────────────────────────────────────────────────────
export interface VocabPair {
  word: string
  definition: string
  grade: number
}

export const VOCAB_BANKS: Record<number, VocabPair[]> = {
  1: [
    { word:'run',    definition:'To move quickly on your feet',   grade:1 },
    { word:'big',    definition:'Very large in size',             grade:1 },
    { word:'happy',  definition:'Feeling good and joyful',        grade:1 },
    { word:'cold',   definition:'Having a low temperature',       grade:1 },
    { word:'loud',   definition:'Making a lot of noise',          grade:1 },
    { word:'soft',   definition:'Not hard; gentle to the touch',  grade:1 },
  ],
  2: [
    { word:'brave',  definition:'Willing to do difficult things without fear', grade:2 },
    { word:'hurry',  definition:'To move or act quickly',                     grade:2 },
    { word:'gentle', definition:'Soft and careful; not rough',                grade:2 },
    { word:'tremble',definition:'To shake slightly from fear or cold',        grade:2 },
    { word:'glitter',definition:'To sparkle or shine with tiny flashes of light',grade:2 },
    { word:'ancient',definition:'Very, very old; from long ago',              grade:2 },
  ],
  3: [
    { word:'curious',   definition:'Eager to learn or know something',         grade:3 },
    { word:'enormous',  definition:'Very large in size or amount',             grade:3 },
    { word:'cautious',  definition:'Being careful to avoid danger or mistakes',grade:3 },
    { word:'transform', definition:'To change completely in form or appearance',grade:3 },
    { word:'admire',    definition:'To look at with pleasure and respect',     grade:3 },
    { word:'exhaust',   definition:'To use up all of something; to tire out',  grade:3 },
  ],
  4: [
    { word:'persistent',  definition:'Continuing firmly despite obstacles',           grade:4 },
    { word:'abundant',    definition:'Present in large quantities; plentiful',        grade:4 },
    { word:'compromise',  definition:'An agreement where each side gives a little',   grade:4 },
    { word:'vivid',       definition:'Producing clear, strong, lifelike images',      grade:4 },
    { word:'obstacle',    definition:'Something that blocks progress or movement',    grade:4 },
    { word:'significant', definition:'Important; having a major effect',              grade:4 },
    { word:'consequence', definition:'A result or effect of an action',               grade:4 },
    { word:'exaggerate',  definition:'To make something seem larger or more important than it is', grade:4 },
  ],
  5: [
    { word:'resilient',   definition:'Able to recover quickly from difficulties',          grade:5 },
    { word:'eloquent',    definition:'Fluent and persuasive in speaking or writing',       grade:5 },
    { word:'innovative',  definition:'Introducing new ideas; creative and original',       grade:5 },
    { word:'ambiguous',   definition:'Open to more than one interpretation; unclear',      grade:5 },
    { word:'culminate',   definition:'To reach the highest or decisive point',             grade:5 },
    { word:'meticulous',  definition:'Showing great attention to detail and accuracy',     grade:5 },
    { word:'perseverance',definition:'Continued effort despite difficulty or delay',       grade:5 },
    { word:'infer',       definition:'To draw a conclusion from evidence without being told directly',grade:5 },
  ],
  6: [
    { word:'lucid',       definition:'Very clear and easy to understand',                  grade:6 },
    { word:'subtle',      definition:'So slight or gradual as to be difficult to detect',  grade:6 },
    { word:'rhetoric',    definition:'Language used persuasively, especially in politics',  grade:6 },
    { word:'paradox',     definition:'A statement that seems contradictory but may be true',grade:6 },
    { word:'pragmatic',   definition:'Dealing with things in a practical, realistic way',   grade:6 },
    { word:'empathy',     definition:'The ability to understand and share another\'s feelings',grade:6 },
    { word:'diction',     definition:'The choice and use of words in writing or speech',    grade:6 },
    { word:'motif',       definition:'A recurring element or theme in a literary work',     grade:6 },
  ],
  7: [
    { word:'infer',      definition:'To conclude from evidence and reasoning, not direct statement', grade:7 },
    { word:'connotation',definition:'An idea or feeling a word implies beyond its literal meaning',  grade:7 },
    { word:'allegory',   definition:'A story in which characters represent abstract ideas or morals', grade:7 },
    { word:'irony',      definition:'A situation where what happens is the opposite of what was expected',grade:7 },
    { word:'synthesis',  definition:'Combining elements from different sources to form a new whole', grade:7 },
    { word:'implicit',   definition:'Suggested or understood without being directly stated',         grade:7 },
    { word:'polemical',  definition:'Strongly attacking or defending a particular position',          grade:7 },
    { word:'juxtapose',  definition:'To place two things side by side to highlight contrast',        grade:7 },
  ],
  8: [
    { word:'hegemony',    definition:'Leadership or dominance, especially of one country or group over others',grade:8 },
    { word:'perfidious',  definition:'Deceitful and untrustworthy; guilty of betrayal',               grade:8 },
    { word:'solipsism',   definition:'The view that only one\'s own mind is certain to exist',        grade:8 },
    { word:'equivocate',  definition:'To use ambiguous language intentionally to avoid commitment',   grade:8 },
    { word:'laconic',     definition:'Using very few words; brief and to the point',                  grade:8 },
    { word:'obsequious',  definition:'Servile and excessively eager to please',                       grade:8 },
    { word:'sycophant',   definition:'A person who flatters those in power to gain favor',            grade:8 },
    { word:'recalcitrant',definition:'Stubbornly resistant to authority or constraint',               grade:8 },
  ],
}

// ── Phonics Power ─────────────────────────────────────────────────────────────
export interface PhonicsItem {
  prompt: string   // spoken via TTS
  answer: string   // the letter(s) to select
  choices: string[]
  grade: number
  type: 'letter' | 'blend' | 'digraph' | 'vowel-team'
}

export const PHONICS_BANKS: PhonicsItem[] = [
  // Single consonants (K)
  { prompt:'buh',  answer:'B', choices:['B','D','P','G'],   grade:0, type:'letter' },
  { prompt:'kuh',  answer:'C', choices:['C','G','K','Q'],   grade:0, type:'letter' },
  { prompt:'duh',  answer:'D', choices:['D','B','P','T'],   grade:0, type:'letter' },
  { prompt:'fuh',  answer:'F', choices:['F','V','P','S'],   grade:0, type:'letter' },
  { prompt:'guh',  answer:'G', choices:['G','C','J','Q'],   grade:0, type:'letter' },
  { prompt:'huh',  answer:'H', choices:['H','N','M','R'],   grade:0, type:'letter' },
  { prompt:'juh',  answer:'J', choices:['J','G','Y','Z'],   grade:0, type:'letter' },
  { prompt:'luh',  answer:'L', choices:['L','R','N','M'],   grade:0, type:'letter' },
  { prompt:'muh',  answer:'M', choices:['M','N','H','W'],   grade:0, type:'letter' },
  { prompt:'nuh',  answer:'N', choices:['N','M','H','R'],   grade:0, type:'letter' },
  { prompt:'puh',  answer:'P', choices:['P','B','D','Q'],   grade:0, type:'letter' },
  { prompt:'ruh',  answer:'R', choices:['R','L','N','W'],   grade:0, type:'letter' },
  { prompt:'sss',  answer:'S', choices:['S','C','Z','X'],   grade:0, type:'letter' },
  { prompt:'tuh',  answer:'T', choices:['T','D','F','P'],   grade:0, type:'letter' },
  // Short vowels (Grade 1)
  { prompt:'short a as in cat', answer:'A', choices:['A','E','O','U'], grade:1, type:'letter' },
  { prompt:'short e as in bed', answer:'E', choices:['E','A','I','O'], grade:1, type:'letter' },
  { prompt:'short i as in sit', answer:'I', choices:['I','E','A','U'], grade:1, type:'letter' },
  { prompt:'short o as in top', answer:'O', choices:['O','A','U','E'], grade:1, type:'letter' },
  { prompt:'short u as in bug', answer:'U', choices:['U','O','A','E'], grade:1, type:'letter' },
  // Blends
  { prompt:'bl as in blue',     answer:'BL', choices:['BL','CL','FL','GL'], grade:1, type:'blend' },
  { prompt:'cr as in crab',     answer:'CR', choices:['CR','DR','BR','FR'], grade:1, type:'blend' },
  { prompt:'st as in star',     answer:'ST', choices:['ST','SP','SK','SN'], grade:1, type:'blend' },
  { prompt:'tr as in tree',     answer:'TR', choices:['TR','DR','CR','PR'], grade:1, type:'blend' },
  { prompt:'gr as in green',    answer:'GR', choices:['GR','CR','PR','FR'], grade:1, type:'blend' },
  // Digraphs
  { prompt:'sh as in ship',     answer:'SH', choices:['SH','CH','TH','WH'], grade:1, type:'digraph' },
  { prompt:'ch as in chip',     answer:'CH', choices:['CH','SH','TH','WH'], grade:1, type:'digraph' },
  { prompt:'th as in the',      answer:'TH', choices:['TH','SH','CH','WH'], grade:1, type:'digraph' },
  { prompt:'wh as in wheel',    answer:'WH', choices:['WH','TH','SH','CH'], grade:1, type:'digraph' },
  // Vowel teams (Grade 2)
  { prompt:'long a as in rain', answer:'AI', choices:['AI','AY','EE','OA'], grade:2, type:'vowel-team' },
  { prompt:'long e as in keep', answer:'EE', choices:['EE','EA','IE','OE'], grade:2, type:'vowel-team' },
  { prompt:'long o as in boat', answer:'OA', choices:['OA','OE','OW','AU'], grade:2, type:'vowel-team' },
  { prompt:'ow sound as in cow',answer:'OW', choices:['OW','OU','OA','OE'], grade:2, type:'vowel-team' },
]

// ── Grammar Galaxy ────────────────────────────────────────────────────────────
export interface GrammarItem {
  sentence: string           // contains an error
  choices: string[]          // 4 options; one is correct
  correct: string            // the correctly fixed sentence
  errorType: string          // 'capitalization' | 'punctuation' | 'agreement' | etc.
  grade: number
  explanation: string
}

export const GRAMMAR_BANKS: GrammarItem[] = [
  // Grade 2
  { sentence:'the dog ran to the park.',  choices:['The dog ran to the park.','the Dog ran to the park.','The Dog Ran To The Park.','the dog Ran to the park.'], correct:'The dog ran to the park.', errorType:'capitalization', grade:2, explanation:'Sentences start with a capital letter.' },
  { sentence:'She likes cats, dogs and birds', choices:['She likes cats, dogs, and birds.','She likes cats dogs and birds.','she likes cats, dogs, and birds.','She likes Cats, Dogs and Birds.'], correct:'She likes cats, dogs, and birds.', errorType:'punctuation', grade:2, explanation:'Use a comma before "and" in a list, and end with a period.' },
  { sentence:'My favorite color are blue.',  choices:['My favorite color is blue.','My favorite colors are blue.','My favorite color was blue.','My Favorite Color Is Blue.'], correct:'My favorite color is blue.', errorType:'agreement', grade:2, explanation:'"Color" is singular, so use "is" not "are".' },
  { sentence:'We goes to school every day.', choices:['We go to school every day.','We going to school every day.','We gone to school every day.','We went at school every day.'], correct:'We go to school every day.', errorType:'agreement', grade:2, explanation:'"We" takes "go", not "goes".' },
  // Grade 3
  { sentence:'its a beautiful day outside!', choices:["It's a beautiful day outside!","Its a beautiful day outside!","It's a Beautiful Day Outside!","its A beautiful day outside!"], correct:"It's a beautiful day outside!", errorType:'apostrophe', grade:3, explanation:'"It\'s" is a contraction meaning "it is".' },
  { sentence:'She walked to the library her book and her bag.', choices:['She walked to the library with her book and her bag.','She walked, to the library her book and her bag.','She walked to the library, her book, and her bag.','She Walked to the library her book and her bag.'], correct:'She walked to the library with her book and her bag.', errorType:'missing-word', grade:3, explanation:'The sentence was missing the preposition "with".' },
  { sentence:'I seen the movie yesterday.', choices:['I saw the movie yesterday.','I have seen the movie yesterday.','I seened the movie yesterday.','I saws the movie yesterday.'], correct:'I saw the movie yesterday.', errorType:'verb-tense', grade:3, explanation:'"Saw" is the simple past tense; "seen" needs a helper verb like "have".' },
  { sentence:'The childrens toys were left outside.', choices:["The children's toys were left outside.",'The childrens\' toys were left outside.','The childrens toys were left outside.','The Childrens toys were left outside.'], correct:"The children's toys were left outside.", errorType:'possessive', grade:3, explanation:'Use apostrophe + s to show possession: children\'s.' },
  // Grade 4
  { sentence:'Their going to the park after school.', choices:["They're going to the park after school.",'There going to the park after school.','Their Going to the park after school.','Theyre going to the park after school.'], correct:"They're going to the park after school.", errorType:'homophone', grade:4, explanation:'"They\'re" = they are. "Their" = belonging. "There" = a place.' },
  { sentence:'Me and my friend climbed the mountain.', choices:['My friend and I climbed the mountain.','Me and my friend climbs the mountain.','My friend and me climbed the mountain.','I and my friend climbed the mountain.'], correct:'My friend and I climbed the mountain.', errorType:'pronoun', grade:4, explanation:'Use "I" not "me" as the subject. List yourself second.' },
  { sentence:'The store sells apple\'s oranges and bananas.', choices:["The store sells apples, oranges, and bananas.",'The store sells apples oranges and bananas.','The store sells apple\'s, oranges, and bananas.','The store sells Apples, Oranges, and Bananas.'], correct:'The store sells apples, oranges, and bananas.', errorType:'apostrophe+punctuation', grade:4, explanation:'No apostrophe for plurals. Use commas to separate items in a list.' },
  { sentence:'He runned faster than anyone on the team.', choices:['He ran faster than anyone on the team.','He runned more fast than anyone on the team.','He has runned faster than anyone on the team.','He run faster than anyone on the team.'], correct:'He ran faster than anyone on the team.', errorType:'irregular-verb', grade:4, explanation:'"Run" is an irregular verb. Past tense is "ran", not "runned".' },
  { sentence:'The book that I readed was very exciting.', choices:['The book that I read was very exciting.','The book that I have read was very exciting.','The book that I readed very exciting.','The book which I readed was very exciting.'], correct:'The book that I read was very exciting.', errorType:'irregular-verb', grade:4, explanation:'"Read" is irregular — past tense is also "read" (pronounced "red"), not "readed".' },
  // Grade 5
  { sentence:'Running down the street, my keys fell out of my pocket.', choices:['Running down the street, I dropped my keys.','Running down the street, the keys were fallen.','My keys fell out of my pocket while running.','While I was running, my keys fell out of my pocket.'], correct:'While I was running, my keys fell out of my pocket.', errorType:'dangling-modifier', grade:5, explanation:'The original is a dangling modifier — "my keys" weren\'t running.' },
  { sentence:'Less students passed the exam than expected.', choices:['Fewer students passed the exam than expected.','Less students was passing the exam than expected.','A lesser amount of students passed the exam than expected.','Not as much students passed the exam than expected.'], correct:'Fewer students passed the exam than expected.', errorType:'fewer-less', grade:5, explanation:'Use "fewer" for countable nouns (students) and "less" for uncountable amounts.' },
  { sentence:'The data shows that climate change is real.', choices:['The data show that climate change is real.','The datum shows that climate change is real.','These data is showing that climate change is real.','The data has shown that climate change is real.'], correct:'The data show that climate change is real.', errorType:'Latin-plural', grade:5, explanation:'"Data" is the plural of "datum" and takes a plural verb: "show", not "shows".' },
  { sentence:'Between you and I, this is a secret.', choices:['Between you and me, this is a secret.','Between you and myself, this is a secret.','Between I and you, this is a secret.','Between you and I, this are a secret.'], correct:'Between you and me, this is a secret.', errorType:'pronoun-case', grade:5, explanation:'Prepositions like "between" require object pronouns: "me" not "I".' },
  // Grade 6
  { sentence:'Each of the students brought their own lunch.', choices:['Each of the students brought his or her own lunch.','Each of the students brought its own lunch.','Each student brought their own lunch.','Every student brought their own lunches.'], correct:'Each of the students brought his or her own lunch.', errorType:'pronoun-agreement', grade:6, explanation:'"Each" is singular, requiring a singular pronoun.' },
  { sentence:'The committee have reached their decision unanimously.', choices:['The committee has reached its decision unanimously.','The committee have reached its decision unanimously.','The committees have reached their decision unanimously.','The committee has reached their decision unanimously.'], correct:'The committee has reached its decision unanimously.', errorType:'collective-noun', grade:6, explanation:'In American English, collective nouns (committee, team, jury) take singular verbs and pronouns.' },
  { sentence:'Hopefully, the weather will improve before the game.', choices:['It is hoped that the weather will improve before the game.','Hopefully, the weather will improves before the game.','It is to be hoped the weather improves before the game.','The weather will hopefully improve before the game.'], correct:'It is hoped that the weather will improve before the game.', errorType:'sentence-adverb', grade:6, explanation:'"Hopefully" as a sentence adverb is disputed in formal writing; restructuring avoids ambiguity.' },
  { sentence:'The situation is very unique.', choices:['The situation is unique.','The situation is quite unique.','The situation is very unusual.','The situation is extremely unique.'], correct:'The situation is unique.', errorType:'absolute-adjective', grade:6, explanation:'"Unique" means "one of a kind" — it cannot be modified by degree words like "very".' },
  // Grade 7
  { sentence:'The team played good in the championship game.', choices:['The team played well in the championship game.','The team played good in the Championship game.','The team played goodly in the championship game.','The team played great in the championship game.'], correct:'The team played well in the championship game.', errorType:'adverb-adjective', grade:7, explanation:'"Played" is a verb, so use the adverb "well", not the adjective "good".' },
  { sentence:'The scientist discovered the cure; whom later won the Nobel Prize.', choices:['The scientist discovered the cure, who later won the Nobel Prize.','The scientist discovered the cure; who later won the Nobel Prize.','The scientist, whom later won the Nobel Prize, discovered the cure.','The scientist discovered the cure whom later won the Nobel Prize.'], correct:'The scientist discovered the cure, who later won the Nobel Prize.', errorType:'who-whom', grade:7, explanation:'"Who" is a subject pronoun — "who won the prize." "Whom" is an object. Use a comma, not semicolon.' },
  { sentence:'Having finished the assignment, the TV was turned on.', choices:['Having finished the assignment, she turned on the TV.','After finishing the assignment, the TV turned on.','The TV was turned on, having finished the assignment.','She was turning on the TV, having finished the assignment.'], correct:'Having finished the assignment, she turned on the TV.', errorType:'dangling-participle', grade:7, explanation:'The participial phrase must modify the subject of the main clause — "she" finished, not "the TV".' },
  { sentence:'Due to the storm, the game was cancelled irregardless of its importance.', choices:['Due to the storm, the game was cancelled regardless of its importance.','Due to the storm, the game was cancelled, regardless of its importance.','Due to the storm, the important game was cancelled irregardless.','Because of the storm, the game was cancelled irregardless of importance.'], correct:'Due to the storm, the game was cancelled regardless of its importance.', errorType:'nonstandard-word', grade:7, explanation:'"Irregardless" is nonstandard English. Use "regardless" — it already contains the negative suffix.' },
  // Grade 8
  { sentence:'Neither the cats nor the dog were happy.', choices:['Neither the cats nor the dog was happy.','Neither the cats nor the dogs were happy.','Neither the cat nor the dog were happy.','Neither the cats nor the dog are happy.'], correct:'Neither the cats nor the dog was happy.', errorType:'neither-nor', grade:8, explanation:'With "neither/nor", the verb agrees with the nearest subject ("dog" = singular = "was").' },
  { sentence:'The report, along with the appendices, were submitted late.', choices:['The report, along with the appendices, was submitted late.','The report, alongside the appendices, were submitted late.','The report and the appendices was submitted late.','The reports, along with the appendices, were submitted late.'], correct:'The report, along with the appendices, was submitted late.', errorType:'intervening-phrase', grade:8, explanation:'Phrases like "along with" are parenthetical and don\'t change the subject. "Report" is singular → "was".' },
  { sentence:'It was her whom arrived first at the ceremony.', choices:['It was she who arrived first at the ceremony.','It was her who arrived first at the ceremony.','It was she whom arrived first at the ceremony.','It was her that arrived first at the ceremony.'], correct:'It was she who arrived first at the ceremony.', errorType:'predicate-nominative', grade:8, explanation:'After a linking verb, use a subject pronoun ("she"). "Who" is correct here since she is the subject of "arrived".' },
  { sentence:'The principle reason for the delay was a miscommunication.', choices:['The principal reason for the delay was a miscommunication.','The principle reasons for the delay was a miscommunication.','The main principle reason for the delay was miscommunication.','The principal reason for the delay were a miscommunication.'], correct:'The principal reason for the delay was a miscommunication.', errorType:'homophone', grade:8, explanation:'"Principal" means "main" or "chief" (adjective/noun). "Principle" means a fundamental truth or rule.' },
]

// ── Speed Reader ─────────────────────────────────────────────────────────────
export interface SpeedItem {
  passage: string
  question: string
  choices: string[]
  correct: string
  grade: number
  readTime: number   // seconds to read
}

export const SPEED_BANKS: SpeedItem[] = [
  // Grade 3
  { passage:'The sun was setting over the mountains. Red and orange colors filled the sky. A little fox watched from the edge of the forest.', question:'Where was the fox watching from?', choices:['A mountain top','The edge of the forest','A river bank','A tall tree'], correct:'The edge of the forest', grade:3, readTime:20 },
  { passage:'Maya loved rainy days. She would put on her yellow boots and splash in every puddle she could find. Her dog Max always followed her.', question:'What did Maya wear on rainy days?', choices:['A raincoat','Yellow boots','Blue sneakers','A big hat'], correct:'Yellow boots', grade:3, readTime:20 },
  { passage:'Owen built a birdhouse out of old wood. He painted it bright red so the birds could find it easily. Three wrens moved in within a week.', question:'Why did Owen paint the birdhouse red?', choices:['He liked red best','So birds could find it easily','His mom asked him to','Red was the only color he had'], correct:'So birds could find it easily', grade:3, readTime:20 },
  // Grade 4
  { passage:'The Amazon rainforest is home to more than three million species of plants and animals. Despite covering only 5% of Earth\'s surface, it produces 20% of the world\'s oxygen and plays a critical role in regulating the global climate.', question:'What percentage of Earth\'s oxygen does the Amazon produce?', choices:['5%','10%','20%','30%'], correct:'20%', grade:4, readTime:18 },
  { passage:'Harriet Tubman escaped slavery in 1849 and returned south more than a dozen times to guide other enslaved people to freedom through the Underground Railroad. She was called "Moses" by those she helped.', question:'Why was Harriet Tubman called "Moses"?', choices:['She was a religious leader','She guided people to freedom like Moses','She lived near a river','She wrote the Bible'], correct:'She guided people to freedom like Moses', grade:4, readTime:18 },
  // Grade 5
  { passage:'Scientists recently discovered that trees communicate through underground fungal networks, sometimes called the "Wood Wide Web." Older trees send nutrients to younger seedlings through these networks, helping the whole forest thrive. Some researchers believe trees can even detect when neighboring trees are in distress.', question:'What is the "Wood Wide Web"?', choices:['A website about trees','A network of satellites','Underground fungal networks connecting trees','A system of tree roots'], correct:'Underground fungal networks connecting trees', grade:5, readTime:15 },
  // Grade 6
  { passage:'The concept of cognitive dissonance, introduced by psychologist Leon Festinger in 1957, describes the mental discomfort experienced when a person holds contradictory beliefs simultaneously. To resolve this tension, people often change one of their beliefs, acquire new information, or reduce the importance of the conflict.', question:'According to the passage, how do people typically resolve cognitive dissonance?', choices:['By ignoring the conflict','By changing a belief, getting new info, or reducing importance of the conflict','By seeking therapy','By debating with others'], correct:'By changing a belief, getting new info, or reducing importance of the conflict', grade:6, readTime:15 },
  // Grade 7-8
  { passage:'In his "Letter from Birmingham Jail," Martin Luther King Jr. argued that individuals have a moral responsibility to disobey unjust laws. Drawing on the philosophy of St. Augustine and St. Thomas Aquinas, King distinguished between just and unjust laws — noting that a just law "uplifts human personality" while an unjust law "degrades human personality."', question:'How did King distinguish just from unjust laws?', choices:['By their age and history','Just laws uplift human personality; unjust laws degrade it','By how many people they apply to','By whether they were written by elected officials'], correct:'Just laws uplift human personality; unjust laws degrade it', grade:7, readTime:12 },
]

// ── Context Clues Detective ───────────────────────────────────────────────────
export interface ContextItem {
  sentence: string       // contains the target word highlighted with *asterisks*
  targetWord: string
  correct: string
  choices: string[]
  grade: number
  clueType: 'definition' | 'synonym' | 'antonym' | 'example' | 'inference'
}

export const CONTEXT_BANKS: ContextItem[] = [
  // Grade 3 — definition clues
  { sentence:'The *nocturnal* owl slept all day and hunted only at night.', targetWord:'nocturnal', correct:'Active at night', choices:['Active at night','Very loud','Living in a nest','Flying quickly'], grade:3, clueType:'definition' },
  { sentence:'The kitten was *timid*, hiding under the bed whenever a stranger came in.', targetWord:'timid', correct:'Shy and easily frightened', choices:['Shy and easily frightened','Very playful','Extremely large','Friendly and bold'], grade:3, clueType:'inference' },
  { sentence:'She felt *elated* — jumping for joy, cheering, and hugging everyone around her — when she heard the good news.', targetWord:'elated', correct:'Extremely happy', choices:['Extremely happy','Very confused','Deeply worried','Quite tired'], grade:3, clueType:'example' },
  // Grade 4
  { sentence:'Unlike his *gregarious* twin who loved parties, Tom preferred to read alone in his room.', targetWord:'gregarious', correct:'Sociable and outgoing', choices:['Sociable and outgoing','Quiet and shy','Good at sports','Clever and smart'], grade:4, clueType:'antonym' },
  { sentence:'The explorers were *parched* after hiking for hours without water, desperate for something to drink.', targetWord:'parched', correct:'Extremely thirsty', choices:['Extremely thirsty','Very tired','Deeply cold','Quite lost'], grade:4, clueType:'inference' },
  // Grade 5
  { sentence:'The professor\'s *verbose* essay took three hours to read; the main idea could have been explained in one paragraph.', targetWord:'verbose', correct:'Using too many words', choices:['Using too many words','Very short and brief','Written in French','Full of errors'], grade:5, clueType:'inference' },
  { sentence:'Despite their *animosity* — years of hatred and feuding — the two rivals finally shook hands.', targetWord:'animosity', correct:'Strong hatred or hostility', choices:['Strong hatred or hostility','Deep friendship','Great admiration','Silent agreement'], grade:5, clueType:'definition' },
  // Grade 6
  { sentence:'The politician\'s *equivocal* statement left everyone confused — some thought he supported the bill, others thought he opposed it.', targetWord:'equivocal', correct:'Ambiguous; open to more than one interpretation', choices:['Ambiguous; open to more than one interpretation','Very clear and direct','Completely false','Extremely popular'], grade:6, clueType:'inference' },
  // Grade 7
  { sentence:'Her writing style was *laconic*: where other authors used three pages, she used three sentences.', targetWord:'laconic', correct:'Using very few words', choices:['Using very few words','Overly detailed and long','Written in poetic form','Difficult to understand'], grade:7, clueType:'example' },
  // Grade 8
  { sentence:'The treaty was *ephemeral*; within months, both nations had resumed hostilities as if it never existed.', targetWord:'ephemeral', correct:'Lasting for only a very short time', choices:['Lasting for only a very short time','Extremely important','Written in secret','Widely celebrated'], grade:8, clueType:'inference' },
  { sentence:'The author used *bathos* to comic effect, interrupting a grand speech about love and honor with a sudden sneeze.', targetWord:'bathos', correct:'Anticlimax; abrupt shift from grand to trivial', choices:['Anticlimax; abrupt shift from grand to trivial','A type of swimming','Extreme sadness','A long pause'], grade:8, clueType:'definition' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get rhyme items for a grade (with grade fallback) */
export function getRhymeItems(grade: number): RhymePair[] {
  const g = Math.min(grade, 8)
  return RHYME_BANKS[g] ?? RHYME_BANKS[Math.min(g, 3)] ?? RHYME_BANKS[0]
}

/** Get sentence items for a grade */
export function getSentenceItems(grade: number): SentenceItem[] {
  const items = SENTENCE_BANKS.filter(s => s.grade <= Math.min(grade + 1, 8))
  return items.length > 0 ? items : SENTENCE_BANKS.slice(0, 6)
}

/** Get vocab pairs for a grade */
export function getVocabItems(grade: number): VocabPair[] {
  const g = Math.max(1, Math.min(grade, 8))
  const items = VOCAB_BANKS[g] ?? VOCAB_BANKS[1]
  // Also include one grade below for review
  const below = g > 1 ? (VOCAB_BANKS[g - 1] ?? []) : []
  return [...below.slice(0, 2), ...items]
}

/** Get phonics items for a grade */
export function getPhonicItems(grade: number): PhonicsItem[] {
  // Phonics is foundational (K-2); higher grades get all phonics + accent on complex patterns
  const g = Math.min(grade, 2)
  return PHONICS_BANKS.filter(p => p.grade <= g)
}

/** Get grammar items for a grade */
export function getGrammarItems(grade: number): GrammarItem[] {
  return GRAMMAR_BANKS.filter(g => g.grade <= Math.min(grade + 1, 8))
}

/** Get speed items for a grade */
export function getSpeedItems(grade: number): SpeedItem[] {
  return SPEED_BANKS.filter(s => s.grade <= Math.min(grade + 1, 8))
}

/** Get context items for a grade */
export function getContextItems(grade: number): ContextItem[] {
  return CONTEXT_BANKS.filter(c => c.grade <= Math.min(grade + 1, 8))
}

/** Get synonym items for a grade */
export function getSynonymItems(grade: number): SynonymItem[] {
  return SYNONYM_BANKS.filter(s => s.grade <= Math.min(grade + 1, 8))
}

/** Calculate XP for completing a correct answer at a given level */
export function calcXP(level: number, streakCount: number): number {
  let base = level <= 10 ? 5 : level <= 30 ? 8 : level <= 60 ? 12 : level <= 85 ? 18 : 25
  const streakBonus = Math.min(streakCount, 10) * (level <= 30 ? 2 : level <= 60 ? 3 : 5)
  return base + streakBonus
}

/** Calculate XP bonus for completing a full level */
export function calcLevelBonus(level: number): number {
  return level <= 10 ? 15 : level <= 30 ? 25 : level <= 60 ? 40 : level <= 85 ? 60 : 100
}

/** Shuffle an array */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Persist game level to localStorage */
export function saveGameLevel(gameId: string, grade: number, level: number) {
  localStorage.setItem(`rq_game_${gameId}_g${grade}_level`, String(level))
}

/** Load game level from localStorage */
export function loadGameLevel(gameId: string, grade: number): number {
  return parseInt(localStorage.getItem(`rq_game_${gameId}_g${grade}_level`) || '1', 10)
}

/** Save stars per level */
export function saveStars(gameId: string, grade: number, level: number, stars: number) {
  const key = `rq_game_${gameId}_g${grade}_stars`
  const all = JSON.parse(localStorage.getItem(key) || '{}')
  all[level] = Math.max(all[level] ?? 0, stars)
  localStorage.setItem(key, JSON.stringify(all))
}
