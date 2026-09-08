/**
 * Builds "Sunday School Companion — Content" in your Google Drive.
 *
 * Run it once. It creates the spreadsheet, all six tabs, the dropdowns, the
 * protections and the formatting, and imports the two chapters that exist in
 * the repository today. It logs the URL when it finishes.
 *
 * How to run it:
 *   1. script.google.com  →  New project
 *   2. Paste this whole file over the contents of Code.gs
 *   3. Run  →  createContentSheet   (approve the permission prompt the first time)
 *   4. View → Logs, and open the link
 *
 * Running it twice creates a second spreadsheet. It never edits an existing one.
 *
 * The sheet holds the BRIEF — what a teacher knows. It deliberately holds no
 * story panels, dialogue, distractors, hint ladders, artwork paths or generated
 * JSON. Those are produced by the private generation pipeline and live in the
 * repository. See CONTENT_PIPELINE.md.
 */

const SHEET_NAME = 'Sunday School Companion — Content';

const CLASSES = [
  // id, tab name, display name, order, live
  ['6-7', '6–7 Years', '6–7 Years', 1, 'Yes'],
  ['8-10', '8–10 Years', '8–10 Years', 2, 'No'],
  ['11-13', '11–13 Years', '11–13 Years', 3, 'No'],
  ['13-16', '13–16 Years', '13–16 Years', 4, 'No'],
];

const STATUSES = ['Draft', 'Ready for Review', 'Published'];
const PRIORITIES = ['Core', 'Supporting'];

/** Plain English on purpose. A teacher never has to learn our vocabulary. */
const GAME_IDEAS = [
  'Pick the right one',
  'Match things together',
  'Put things in order',
  'Explore and find',
];

/* The product's own palette, so the sheet feels like part of the thing. */
const INK = '#0E1731';
const INK_TEXT = '#F2F0EA';
const SECTION = '#16224A';
const COMPUTED_BG = '#F1F3F9';
const COMPUTED_TEXT = '#6B7280';
const HELP_BG = '#FBFAF7';

/** Column, width in pixels, whether it wraps, and the note on its header. */
const CLASS_COLUMNS = [
  ['Chapter', 80, false,
    'The chapter number for this class. Chapter 1 exists in every class — that is fine and expected.'],
  ['Title', 210, true,
    'The lesson title, as a child would hear it.'],
  ['Bible Reference', 140, false,
    'The passage this lesson comes from. For example: Luke 2:22–38'],
  ['Curriculum', 460, true,
    'The most important cell in this sheet. What the lesson is about, in your own words — as much or as little as you need. Do NOT rewrite it for children; that is done for you later.'],
  ['Learning Objectives', 320, true,
    'Shown automatically from the Learning Objectives tab. Do not type here — add objectives on that tab and they appear here.'],
  ['Memory Verse', 300, true,
    'The words children should learn. Leave blank if this lesson has none.'],
  ['Memory Verse Reference', 160, false,
    'Where the verse comes from. For example: Luke 2:30'],
  ['Video', 210, false,
    'Optional. Paste the whole YouTube link — we will pull out what we need.'],
  ['Take Home', 300, true,
    'Optional. Something the child can do or ask about with their family after the lesson.'],
  ['Suggested Story Approach', 300, true,
    'Optional, and only a suggestion. How might this lesson connect to a child’s own life? You do not need to write a script.'],
  ['Suggested Game Approach', 240, true,
    'Optional, and only a suggestion. Pick from the list or write your own idea. We choose the final game.'],
  ['Contributor', 140, false,
    'Who wrote this brief.'],
  ['Status', 150, false,
    'Draft while you are working. Ready for Review when you are done — that is all you need to do.'],
  ['Notes', 300, true,
    'Anything else we should know: a caution, a local reference, something to avoid.'],
];

const LO_COLUMNS = [
  ['Class', 150, false, 'Which class this objective belongs to.'],
  ['Chapter', 90, false, 'The chapter number in that class.'],
  ['Objective ID', 110, false, 'Filled in automatically. Nothing to type.'],
  ['Learning Objective', 460, true,
    'What should the child understand, remember, notice or be able to do after this lesson? One idea per row. Add as many rows as the lesson needs.'],
  ['Priority', 120, false,
    'Core means this one must be covered by a game. Supporting means it is welcome but optional.'],
  ['Notes', 300, true, 'Anything that would help us design a good game for this.'],
];

/* ------------------------------------------------------------------ */

function createContentSheet() {
  const ss = SpreadsheetApp.create(SHEET_NAME);

  buildConfig(ss.getSheets()[0]);

  CLASSES.forEach(function (c, i) {
    buildClassTab(ss.insertSheet(c[1], i + 1), c[2]);
  });

  const lo = ss.insertSheet('Learning Objectives', CLASSES.length + 1);
  buildLearningObjectives(lo);

  seed(ss);

  ss.setActiveSheet(ss.getSheetByName('6–7 Years'));
  Logger.log('Created: ' + ss.getUrl());
  return ss.getUrl();
}

/** One header row, styled the same way everywhere. */
function header(sheet, columns) {
  const titles = columns.map(function (c) { return c[0]; });
  const range = sheet.getRange(1, 1, 1, titles.length);

  range.setValues([titles])
    .setBackground(INK)
    .setFontColor(INK_TEXT)
    .setFontWeight('bold')
    .setFontSize(11)
    .setVerticalAlignment('middle')
    .setWrap(true);

  columns.forEach(function (c, i) {
    sheet.setColumnWidth(i + 1, c[1]);
    if (c[3]) sheet.getRange(1, i + 1).setNote(c[3]);
    if (c[2]) sheet.getRange(2, i + 1, 500).setWrap(true);
  });

  sheet.setRowHeight(1, 44);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, 500, titles.length)
    .setVerticalAlignment('top')
    .setFontSize(10);
}

function dropdown(sheet, column, values, strict) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(!strict)
    .build();
  sheet.getRange(2, column, 500).setDataValidation(rule);
}

/** Read-only, and it looks read-only. */
function computed(sheet, column, rows) {
  sheet.getRange(2, column, rows)
    .setBackground(COMPUTED_BG)
    .setFontColor(COMPUTED_TEXT)
    .setFontStyle('italic');

  sheet.getRange(2, column, rows)
    .protect()
    .setDescription('Filled in automatically')
    .setWarningOnly(true);
}

/* ------------------------------------------------------------------ */

function buildClassTab(sheet, className) {
  header(sheet, CLASS_COLUMNS);
  sheet.setFrozenColumns(1);

  dropdown(sheet, 11, GAME_IDEAS, false); // a suggestion — typing your own is fine
  dropdown(sheet, 13, STATUSES, true);    // three, and only three

  /*
    Objectives have one home — the Learning Objectives tab — and this column
    shows them here. A teacher sees their objectives on the chapter row without
    the same words living in two places and drifting apart.
  */
  const formulas = [];
  for (var r = 2; r <= 201; r++) {
    formulas.push(['=IF($A' + r + '="","",IFERROR(TEXTJOIN(CHAR(10),TRUE,' +
      'FILTER(\'Learning Objectives\'!$D$2:$D$500,' +
      '\'Learning Objectives\'!$A$2:$A$500="' + className + '",' +
      '\'Learning Objectives\'!$B$2:$B$500=$A' + r + ')),""))']);
  }
  sheet.getRange(2, 5, formulas.length, 1).setFormulas(formulas);
  computed(sheet, 5, 200);

  sheet.getRange(2, 1, 500, 1).setHorizontalAlignment('center');
  sheet.getRange(1, 1, 1, CLASS_COLUMNS.length).createFilter();
  sheet.getRange(2, 1, 200, CLASS_COLUMNS.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);

  sheet.deleteColumns(CLASS_COLUMNS.length + 1,
    sheet.getMaxColumns() - CLASS_COLUMNS.length);
}

function buildLearningObjectives(sheet) {
  header(sheet, LO_COLUMNS);

  dropdown(sheet, 1, CLASSES.map(function (c) { return c[2]; }), true);
  dropdown(sheet, 5, PRIORITIES, true);

  /* Numbered per chapter, so nobody has to invent an ID. */
  const ids = [];
  for (var r = 2; r <= 501; r++) {
    ids.push(['=IF(OR($A' + r + '="",$B' + r + '=""),"",' +
      'TEXT($B' + r + ',"00")&"."&COUNTIFS($A$2:$A' + r + ',$A' + r +
      ',$B$2:$B' + r + ',$B' + r + '))']);
  }
  sheet.getRange(2, 3, ids.length, 1).setFormulas(ids);
  computed(sheet, 3, 500);

  sheet.getRange(2, 2, 500, 2).setHorizontalAlignment('center');
  sheet.getRange(1, 1, 1, LO_COLUMNS.length).createFilter();
  sheet.getRange(2, 1, 200, LO_COLUMNS.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);

  sheet.deleteColumns(LO_COLUMNS.length + 1,
    sheet.getMaxColumns() - LO_COLUMNS.length);
}

/**
 * Config holds the controlled values and the only instructions anyone needs.
 *
 * There is no separate help tab on purpose: six tabs was the brief, and help
 * that lives one click away from the work is help nobody reads. The short
 * version is here, and every column header carries its own note.
 */
function buildConfig(sheet) {
  sheet.setName('Config');

  const help = [
    ['Sunday School Companion — Content'],
    [''],
    ['This sheet is where lessons begin. You write what a lesson is about; everything a child eventually sees is made from it later.'],
    [''],
    ['To add a lesson:'],
    ['1.  Open your class tab.'],
    ['2.  Add a row. Fill in the chapter number, title and Bible reference.'],
    ['3.  Write the Curriculum — the lesson in your own words. This is the important one. Do not simplify it for children; that happens later.'],
    ['4.  Go to the Learning Objectives tab and add a row for each thing a child should come away with. One idea per row.'],
    ['5.  Add the memory verse, a video link and a take-home if the lesson has them. All optional.'],
    ['6.  Set Status to "Ready for Review". That is all you need to do.'],
    [''],
    ['You never need to write story panels, dialogue, questions or answers. Those are made from what you write here.'],
    [''],
    ['Hover any column heading for a one-line explanation of it.'],
    [''],
  ];

  sheet.getRange(1, 1, help.length, 1).setValues(help);
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor(INK);
  sheet.getRange(5, 1).setFontWeight('bold');
  sheet.getRange(13, 1).setFontStyle('italic').setFontColor(COMPUTED_TEXT);
  sheet.getRange(15, 1).setFontStyle('italic').setFontColor(COMPUTED_TEXT);
  sheet.getRange(1, 1, help.length, 1).setWrap(true);
  sheet.setColumnWidth(1, 220);

  var row = help.length + 1;

  row = table(sheet, row, 'Classes',
    ['Class ID', 'Tab Name', 'Display Name', 'Order', 'Live'],
    CLASSES);
  sheet.getRange(row - CLASSES.length, 1, CLASSES.length, 1)
    .setNote('Used by the import to name content/brief/<id>.json. Do not change an ID once a class has chapters in it.');

  row = table(sheet, row + 1, 'Statuses', ['Status', 'Means'], [
    ['Draft', 'Being written. Not in the app.'],
    ['Ready for Review', 'Finished by the contributor. Not in the app yet.'],
    ['Published', 'Reviewed, made and approved. In the app. Set by the production owner only.'],
  ]);

  row = table(sheet, row + 1, 'Objective Priority', ['Priority', 'Means'], [
    ['Core', 'Must be covered by a game.'],
    ['Supporting', 'Welcome, but optional.'],
  ]);

  row = table(sheet, row + 1, 'Game ideas a contributor can suggest',
    ['In the sheet', 'What we build'], [
      ['Pick the right one', 'Selection'],
      ['Match things together', 'Pairing'],
      ['Put things in order', 'Ordering'],
      ['Explore and find', 'Discovery'],
      ['(blank)', 'We decide'],
    ]);

  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 70);
  sheet.setColumnWidth(5, 380);
  sheet.getRange(1, 1, sheet.getMaxRows(), 5).setBackground(HELP_BG);
  sheet.getRange(1, 1, help.length, 5).setBackground(HELP_BG);
  sheet.setHiddenGridlines(true);

  sheet.protect()
    .setDescription('Config — controlled values')
    .setWarningOnly(true);
}

function table(sheet, row, title, headings, rows) {
  sheet.getRange(row, 1)
    .setValue(title)
    .setFontWeight('bold')
    .setFontColor(INK_TEXT)
    .setBackground(SECTION);
  sheet.getRange(row, 1, 1, headings.length).setBackground(SECTION);
  row += 1;

  sheet.getRange(row, 1, 1, headings.length)
    .setValues([headings])
    .setFontWeight('bold')
    .setFontColor(COMPUTED_TEXT);
  row += 1;

  sheet.getRange(row, 1, rows.length, headings.length).setValues(rows);
  sheet.getRange(row, 1, rows.length, headings.length).setWrap(true);
  return row + rows.length + 1;
}

/* ------------------------------------------------------------------ */

/**
 * The two chapters that exist in the repository today.
 *
 * Curriculum is deliberately blank on both. Neither chapter ever had one —
 * their child-facing text was authored directly, which is the gap this sheet
 * exists to close. Nothing here is invented; every filled cell is a value that
 * exists in content/*.story.json.
 */
function seed(ss) {
  const sheet = ss.getSheetByName('6–7 Years');

  const rows = [
    [1, 'Baby Jesus at the Temple', 'Luke 2:22–38', '',
      'My eyes have seen your salvation.', 'Luke 2:30', '', '', '', '', '',
      'Draft',
      'Imported from content/baby-jesus-at-the-temple.story.json. No curriculum was ever written for it — the child-facing text was authored directly. ' +
      'CHECK: the repository says Luke 2:22–38, which includes Anna (vv. 36–38) and the chapter has two Anna panels; the brief said 22–33, which stops at Simeon. ' +
      'Art direction already agreed: cover is Mary holding Jesus with Simeon reaching out, warm temple light. "Simeon held the baby" is the heart of the chapter and gets the most space. It ends on gladness passed on, not on the ceremony finishing.'],

    [2, 'Stephen', 'Acts 6–7', '',
      'Be kind to one another, forgiving one another.', 'Ephesians 4:32', '', '', '', '', '',
      'Draft',
      'Imported from content/stephen.story.json. No curriculum was ever written for it. ' +
      'The memory verse translation is still PLACEHOLDER in the repository and currently raises a build warning — it needs a real translation. ' +
      'Art direction already agreed: we never show the stoning; the turning point is light from above with the crowd out of focus; aftermath, not event; the chapter must not end on grief.'],
  ];

  rows.forEach(function (r, i) {
    const row = i + 2;
    sheet.getRange(row, 1, 1, 4).setValues([r.slice(0, 4)]);      // A–D
    sheet.getRange(row, 6, 1, 9).setValues([r.slice(4)]);          // F–N, skipping the formula
  });

  const lo = ss.getSheetByName('Learning Objectives');
  const derived = 'Derived from a game the chapter already contains — not supplied by a contributor.';

  const objectives = [
    ['6–7 Years', 1, 'Recall who was waiting at the temple to see Jesus.', 'Core', derived],
    ['6–7 Years', 2, 'Recall how Stephen helped people.', 'Core', derived],
    ['6–7 Years', 2, 'Remember what Stephen prayed for the people who hurt him.', 'Core', derived],
    ['6–7 Years', 2, 'Understand the order the events happened in.', 'Supporting',
      'Derived from the chapter’s existing sequence activity.'],
  ];

  objectives.forEach(function (o, i) {
    const row = i + 2;
    lo.getRange(row, 1, 1, 2).setValues([[o[0], o[1]]]);           // A–B
    lo.getRange(row, 4, 1, 3).setValues([[o[2], o[3], o[4]]]);     // D–F
  });

  sheet.setRowHeights(2, rows.length, 120);
  lo.setRowHeights(2, objectives.length, 48);
}
