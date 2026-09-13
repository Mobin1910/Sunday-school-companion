/**
 * Builds the Sunday School Companion master library in your Google Drive.
 *
 * The skeleton already exists — the root, the seven classes, Shared and its
 * subfolders, and Nursery / Chapter 01 complete, all created directly. What
 * is left is the bulk: 139 more chapters, seven subfolders each, about 1,100
 * folders. That is one run of this script and several hundred round trips
 * any other way.
 *
 * You run it yourself, with your own Google account, so no credential ever
 * enters the repository. Same arrangement as `tools/sheet/create-sheet.gs`.
 *
 * Because it is idempotent it will reuse every folder that already exists
 * and create only what is missing, so running it now is safe and running it
 * again later is how you add chapters 21 and up.
 *
 * How to run it:
 *   1. script.google.com  →  New project
 *   2. Paste this whole file over the contents of Code.gs
 *   3. Run  →  createLibrary   (approve the permission prompt the first time)
 *   4. View → Logs
 *
 * IDEMPOTENT. It never creates a folder that already exists — it looks for
 * one by name first and reuses it. Running it twice does nothing the second
 * time except log what it found. That matters more than it sounds: this
 * makes about 1,100 folders, Apps Script stops a script at six minutes, and
 * the recovery for a timeout is simply to run it again.
 *
 * It NEVER deletes, moves or renames anything. If it finds two folders with
 * the same name it uses the first and says so, rather than tidying up on
 * your behalf — deciding which of two "Chapter 03" folders is the real one
 * is not a decision a script should make.
 *
 * It creates no files, no curriculum and no placeholder lessons. Empty
 * chapter folders are the point: they are filing cabinet drawers, and a
 * drawer is not a promise that there is anything in it yet.
 */

/** The root. One, and only one. */
const ROOT = 'Sunday School Companion';

/**
 * The library that already exists, for reference:
 * https://drive.google.com/drive/folders/1bUylCp5oc4PAn6I1zV4SuDSblTv7d9OJ
 *
 * The script does not use this id. It finds the root by name, so it keeps
 * working if the folder is ever moved or recreated — an id pinned in a file
 * is an id that outlives the thing it points at.
 */

/**
 * The classes, youngest to oldest.
 *
 * The numeric prefixes exist because Drive sorts alphabetically and
 * "Beginner" would otherwise come before "Nursery". The names themselves are
 * canonical Sunday School class names and carry no ages — a class is a
 * class, and the age band that maps to it is a fact about a congregation
 * rather than about this library.
 */
const CLASSES = [
  '01 - Nursery',
  '02 - Beginner',
  '03 - Primary',
  '04 - Junior',
  '05 - Intermediate',
  '06 - Senior',
  '07 - Young Adult',
];

/**
 * How many chapter drawers to open per class.
 *
 * Twenty is a year. Raising this and running again tops every class up;
 * lowering it does nothing, because this script does not delete.
 */
const CHAPTERS = 20;

/**
 * What every chapter holds, and the whole filing system in seven lines.
 *
 * Numbered so they sort in workflow order — source first, approved last —
 * which is also the order a chapter moves through them. A contributor only
 * ever needs the first two.
 */
const CHAPTER_FOLDERS = [
  '01 - Curriculum Source',
  '02 - Teacher Materials',
  '03 - Working Content',
  '04 - Story Artwork',
  '05 - Games',
  '06 - Memory Verse',
  '07 - Approved Assets',
];

/** Things that belong to every class, so they live in none of them. */
const SHARED = [
  'Character References',
  'Halo References',
  'Brand References',
  'App Branding',
  'General Bible References',
  'Templates',
];

const ADMIN = '00 - Admin & Templates';
const SHARED_ROOT = '08 - Shared';

/* ------------------------------------------------------------------ */

var made = 0;
var found = 0;
var duplicates = [];

/**
 * Finds a folder by name inside a parent, or creates it.
 *
 * The whole of the idempotency, in one function. Everything below calls
 * this and nothing below calls `createFolder` directly, so there is exactly
 * one place that can create a duplicate and it is the one place that checks
 * first.
 */
function folder(parent, name) {
  const existing = parent.getFoldersByName(name);

  if (existing.hasNext()) {
    const first = existing.next();
    found++;

    /*
      Reported, never resolved. Two folders of the same name is a thing a
      human did and a human has to look at; picking one to delete is not a
      script's decision to make.
    */
    if (existing.hasNext()) {
      duplicates.push(parent.getName() + ' / ' + name);
    }
    return first;
  }

  made++;
  return parent.createFolder(name);
}

/** `Chapter 01`, never `Chapter 1`. Two digits sort; one digit does not. */
function chapterName(n) {
  return 'Chapter ' + (n < 10 ? '0' + n : String(n));
}

function createLibrary() {
  const started = new Date();
  const root = folder(DriveApp.getRootFolder(), ROOT);

  folder(root, ADMIN);

  CLASSES.forEach(function (className) {
    const classFolder = folder(root, className);

    for (var n = 1; n <= CHAPTERS; n++) {
      const chapter = folder(classFolder, chapterName(n));
      CHAPTER_FOLDERS.forEach(function (name) {
        folder(chapter, name);
      });
    }

    Logger.log('done: ' + className);
  });

  const shared = folder(root, SHARED_ROOT);
  SHARED.forEach(function (name) {
    folder(shared, name);
  });

  const seconds = Math.round((new Date() - started) / 1000);

  Logger.log('');
  Logger.log('Sunday School Companion library');
  Logger.log('  ' + root.getUrl());
  Logger.log('  created ' + made + ' folder(s), reused ' + found + ', in ' + seconds + 's');

  if (duplicates.length > 0) {
    Logger.log('');
    Logger.log('  ' + duplicates.length + ' duplicate name(s) found and left alone:');
    duplicates.forEach(function (d) { Logger.log('    ' + d); });
  }

  Logger.log('');
  Logger.log('Run verifyLibrary() to check the whole tree.');
}

/**
 * Checks the library without touching it.
 *
 * Creates nothing, so it is safe to run at any time and is the thing to run
 * after `createLibrary` stops early. It answers the only question that
 * matters — is every folder actually there — rather than trusting the log
 * of a run that may have been cut off at six minutes.
 */
function verifyLibrary() {
  const roots = DriveApp.getRootFolder().getFoldersByName(ROOT);
  if (!roots.hasNext()) {
    Logger.log('MISSING: "' + ROOT + '" does not exist. Run createLibrary().');
    return;
  }

  const root = roots.next();
  if (roots.hasNext()) {
    Logger.log('WARNING: more than one folder named "' + ROOT + '". Using the first.');
  }

  const missing = [];

  function expect(parent, name, path) {
    const it = parent.getFoldersByName(name);
    if (!it.hasNext()) {
      missing.push(path);
      return null;
    }
    return it.next();
  }

  expect(root, ADMIN, ADMIN);

  var chaptersOk = 0;
  CLASSES.forEach(function (className) {
    const classFolder = expect(root, className, className);
    if (!classFolder) return;

    for (var n = 1; n <= CHAPTERS; n++) {
      const name = chapterName(n);
      const chapter = expect(classFolder, name, className + '/' + name);
      if (!chapter) continue;

      var complete = true;
      CHAPTER_FOLDERS.forEach(function (sub) {
        if (!expect(chapter, sub, className + '/' + name + '/' + sub)) complete = false;
      });
      if (complete) chaptersOk++;
    }
  });

  const shared = expect(root, SHARED_ROOT, SHARED_ROOT);
  if (shared) {
    SHARED.forEach(function (name) {
      expect(shared, name, SHARED_ROOT + '/' + name);
    });
  }

  Logger.log(root.getUrl());
  Logger.log(chaptersOk + ' of ' + CLASSES.length * CHAPTERS + ' chapters are complete.');

  if (missing.length === 0) {
    Logger.log('Everything is in place.');
  } else {
    Logger.log(missing.length + ' folder(s) missing — run createLibrary() again:');
    missing.slice(0, 40).forEach(function (m) { Logger.log('  ' + m); });
    if (missing.length > 40) Logger.log('  … and ' + (missing.length - 40) + ' more');
  }
}
