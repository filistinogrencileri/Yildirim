/* eslint-disable no-console */
// Idempotent dev/prod seed: base lists, profile sections + fields,
// starter universities/majors, feature flags, the initial admin user,
// plus a fully-profiled demo student with a submitted application.
import { createHash, randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { FieldType, Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import sharp from 'sharp';
import {
  APP_SETTING_KEYS,
  DEFAULT_SITE_SETTINGS,
  LEGAL_KEY,
  LIST_KEYS,
  SECTION_KEYS,
  SITE_SETTINGS_KEY,
  type SiteSettings,
} from '@yildirim/shared';

const prisma = new PrismaClient();

type Localized = { ar: string; en?: string };

async function seedList(key: string, name: Localized, items: Array<{ value: string; label: Localized }>) {
  const list = await prisma.list.upsert({
    where: { key },
    update: { name },
    create: { key, name },
  });
  for (const [i, item] of items.entries()) {
    await prisma.listItem.upsert({
      where: { listId_value: { listId: list.id, value: item.value } },
      update: { label: item.label, sortOrder: i },
      create: { listId: list.id, value: item.value, label: item.label, sortOrder: i },
    });
  }
  return list;
}

async function seedSection(
  key: string,
  title: Localized,
  sortOrder: number,
  isRepeatable: boolean,
  fields: Array<{
    key: string;
    label: Localized;
    type: FieldType;
    required?: boolean;
    listKey?: string;
    validation?: Prisma.InputJsonValue;
  }>,
) {
  const section = await prisma.profileSection.upsert({
    where: { key },
    update: { title, sortOrder, isRepeatable },
    create: { key, title, sortOrder, isRepeatable },
  });
  for (const [i, f] of fields.entries()) {
    const list = f.listKey ? await prisma.list.findUniqueOrThrow({ where: { key: f.listKey } }) : null;
    await prisma.fieldDefinition.upsert({
      where: { sectionId_key: { sectionId: section.id, key: f.key } },
      update: {
        label: f.label,
        type: f.type,
        listId: list?.id ?? null,
        validation: f.validation,
        isRequiredForProfile: f.required ?? false,
        sortOrder: i,
      },
      create: {
        sectionId: section.id,
        key: f.key,
        label: f.label,
        type: f.type,
        listId: list?.id,
        validation: f.validation,
        isRequiredForProfile: f.required ?? false,
        sortOrder: i,
      },
    });
  }
}

async function main() {
  // ── feature flags ──
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_KEYS.EMAIL_VERIFICATION_ENFORCED },
    update: {},
    create: { key: APP_SETTING_KEYS.EMAIL_VERIFICATION_ENFORCED, value: false },
  });

  // ── configurable lists ──
  await seedList(LIST_KEYS.REFERRAL_SOURCE, { ar: 'كيف سمعت عنا', en: 'How did you hear about us' }, [
    { value: 'facebook', label: { ar: 'فيسبوك', en: 'Facebook' } },
    { value: 'instagram', label: { ar: 'إنستغرام', en: 'Instagram' } },
    { value: 'tiktok', label: { ar: 'تيك توك', en: 'TikTok' } },
    { value: 'youtube', label: { ar: 'يوتيوب', en: 'YouTube' } },
    { value: 'friend', label: { ar: 'صديق أو قريب', en: 'Friend or relative' } },
    { value: 'other', label: { ar: 'أخرى', en: 'Other' } },
  ]);

  await seedList(LIST_KEYS.GENDERS, { ar: 'الجنس', en: 'Gender' }, [
    { value: 'male', label: { ar: 'ذكر', en: 'Male' } },
    { value: 'female', label: { ar: 'أنثى', en: 'Female' } },
  ]);

  await seedList(LIST_KEYS.DEGREE_LEVELS, { ar: 'المرحلة الدراسية', en: 'Degree level' }, [
    { value: 'high_school', label: { ar: 'الشهادة الثانوية', en: 'High school' } },
    { value: 'bachelor', label: { ar: 'بكالوريوس', en: 'Bachelor' } },
    { value: 'master', label: { ar: 'ماجستير', en: 'Master' } },
    { value: 'phd', label: { ar: 'دكتوراه', en: 'PhD' } },
  ]);

  await seedList(LIST_KEYS.MARITAL_STATUS, { ar: 'الحالة الاجتماعية', en: 'Marital status' }, [
    { value: 'single', label: { ar: 'أعزب/عزباء', en: 'Single' } },
    { value: 'married', label: { ar: 'متزوج/ة', en: 'Married' } },
    { value: 'divorced', label: { ar: 'مطلّق/ة', en: 'Divorced' } },
    { value: 'widowed', label: { ar: 'أرمل/ة', en: 'Widowed' } },
  ]);

  await seedList(LIST_KEYS.PASSPORT_TYPES, { ar: 'نوع جواز السفر', en: 'Passport type' }, [
    { value: 'ordinary', label: { ar: 'عادي', en: 'Ordinary' } },
    { value: 'special', label: { ar: 'خاص', en: 'Special' } },
    { value: 'service', label: { ar: 'خدمة', en: 'Service' } },
    { value: 'diplomatic', label: { ar: 'دبلوماسي', en: 'Diplomatic' } },
  ]);

  await seedList(LIST_KEYS.UNIVERSITY_TYPES, { ar: 'نوع الجامعة', en: 'University type' }, [
    { value: 'state', label: { ar: 'حكومية', en: 'State' } },
    { value: 'foundation', label: { ar: 'وقفية (خاصة)', en: 'Foundation' } },
  ]);

  await seedList(
    LIST_KEYS.RESIDENCE_REGISTRATION_TYPES,
    { ar: 'نوع التسجيل على الإقامة', en: 'Residence registration type' },
    [
      { value: 'first_time', label: { ar: 'تسجيل أول مرة', en: 'First-time application' } },
      { value: 'extension', label: { ar: 'تمديد', en: 'Extension' } },
    ],
  );

  await seedList(LIST_KEYS.IMMIGRATION_OFFICES, { ar: 'فروع إدارة الهجرة', en: 'Immigration offices' }, [
    { value: 'istanbul_fatih', label: { ar: 'إسطنبول — الفاتح', en: 'Istanbul — Fatih' } },
    { value: 'istanbul_pendik', label: { ar: 'إسطنبول — بنديك', en: 'Istanbul — Pendik' } },
    { value: 'istanbul_esenyurt', label: { ar: 'إسطنبول — إسنيورت', en: 'Istanbul — Esenyurt' } },
    { value: 'ankara', label: { ar: 'أنقرة', en: 'Ankara' } },
    { value: 'bursa', label: { ar: 'بورصة', en: 'Bursa' } },
    { value: 'izmir', label: { ar: 'إزمير', en: 'Izmir' } },
    { value: 'sakarya', label: { ar: 'سكاريا', en: 'Sakarya' } },
    { value: 'antalya', label: { ar: 'أنطاليا', en: 'Antalya' } },
    { value: 'trabzon', label: { ar: 'طرابزون', en: 'Trabzon' } },
  ]);

  await seedList(LIST_KEYS.COUNTRIES, { ar: 'الدول', en: 'Countries' }, [
    { value: 'SY', label: { ar: 'سوريا', en: 'Syria' } },
    { value: 'PS', label: { ar: 'فلسطين', en: 'Palestine' } },
    { value: 'JO', label: { ar: 'الأردن', en: 'Jordan' } },
    { value: 'LB', label: { ar: 'لبنان', en: 'Lebanon' } },
    { value: 'EG', label: { ar: 'مصر', en: 'Egypt' } },
    { value: 'IQ', label: { ar: 'العراق', en: 'Iraq' } },
    { value: 'YE', label: { ar: 'اليمن', en: 'Yemen' } },
    { value: 'LY', label: { ar: 'ليبيا', en: 'Libya' } },
    { value: 'SD', label: { ar: 'السودان', en: 'Sudan' } },
    { value: 'TR', label: { ar: 'تركيا', en: 'Türkiye' } },
  ]);

  // ── profile sections + field definitions ──
  await seedSection(SECTION_KEYS.PERSONAL_INFO, { ar: 'المعلومات الشخصية', en: 'Personal info' }, 1, false, [
    { key: 'birth_date', label: { ar: 'تاريخ الميلاد', en: 'Date of birth' }, type: 'DATE', required: true },
    { key: 'gender', label: { ar: 'الجنس', en: 'Gender' }, type: 'SELECT', required: true, listKey: LIST_KEYS.GENDERS },
    { key: 'nationality', label: { ar: 'الجنسية', en: 'Nationality' }, type: 'SELECT', required: true, listKey: LIST_KEYS.COUNTRIES },
    { key: 'residence_country', label: { ar: 'بلد الإقامة الحالي', en: 'Country of residence' }, type: 'SELECT', required: true, listKey: LIST_KEYS.COUNTRIES },
    { key: 'place_of_birth', label: { ar: 'مكان الميلاد', en: 'Place of birth' }, type: 'TEXT', validation: { maxLength: 120 } },
    { key: 'country_of_birth', label: { ar: 'دولة الميلاد', en: 'Country of birth' }, type: 'SELECT', listKey: LIST_KEYS.COUNTRIES },
    { key: 'marital_status', label: { ar: 'الحالة الاجتماعية', en: 'Marital status' }, type: 'SELECT', listKey: LIST_KEYS.MARITAL_STATUS },
    { key: 'passport_given_name', label: { ar: 'الاسم كما في جواز السفر', en: 'Given name (as in passport)' }, type: 'TEXT', validation: { maxLength: 80, regex: "^[A-Za-z\\s.'-]+$" } },
    { key: 'passport_surname', label: { ar: 'اسم العائلة كما في جواز السفر', en: 'Surname (as in passport)' }, type: 'TEXT', validation: { maxLength: 80, regex: "^[A-Za-z\\s.'-]+$" } },
    { key: 'father_name', label: { ar: 'اسم الأب', en: "Father's name" }, type: 'TEXT', validation: { maxLength: 80 } },
    { key: 'mother_name', label: { ar: 'اسم الأم', en: "Mother's name" }, type: 'TEXT', validation: { maxLength: 80 } },
  ]);

  await seedSection(SECTION_KEYS.ACADEMIC_INFO, { ar: 'المعلومات الأكاديمية', en: 'Academic info' }, 2, false, [
    { key: 'degree_level', label: { ar: 'المرحلة الدراسية الحالية', en: 'Current degree level' }, type: 'SELECT', required: true, listKey: LIST_KEYS.DEGREE_LEVELS },
    { key: 'high_school_gpa', label: { ar: 'معدل الشهادة الثانوية (%)', en: 'High-school GPA (%)' }, type: 'NUMBER', required: true, validation: { min: 0, max: 100 } },
    { key: 'graduation_year', label: { ar: 'سنة التخرج من الثانوية', en: 'High-school graduation year' }, type: 'NUMBER', required: true, validation: { min: 1990, max: 2035 } },
  ]);

  await seedSection(SECTION_KEYS.WORK_EXPERIENCE, { ar: 'الخبرات العملية', en: 'Work experience' }, 3, true, [
    { key: 'employer', label: { ar: 'جهة العمل', en: 'Employer' }, type: 'TEXT' },
    { key: 'job_title', label: { ar: 'المسمى الوظيفي', en: 'Job title' }, type: 'TEXT' },
    { key: 'years', label: { ar: 'عدد سنوات الخبرة', en: 'Years' }, type: 'NUMBER', validation: { min: 0, max: 50 } },
  ]);

  await seedSection(SECTION_KEYS.DOCUMENTS, { ar: 'المستندات', en: 'Documents' }, 4, false, [
    { key: 'passport_copy', label: { ar: 'صورة جواز السفر', en: 'Passport copy' }, type: 'FILE_PDF', required: true, validation: { maxSizeMb: 10 } },
    { key: 'high_school_certificate', label: { ar: 'الشهادة الثانوية', en: 'High-school certificate' }, type: 'FILE_PDF', required: true, validation: { maxSizeMb: 10 } },
    { key: 'transcript', label: { ar: 'كشف العلامات', en: 'Transcript' }, type: 'FILE_PDF', validation: { maxSizeMb: 10 } },
  ]);

  // ── residence-permit profile sections ──
  // one-time migration: passport_no was originally seeded under personal_info;
  // move the SAME field row (values reference fieldId, so student data survives)
  {
    const passportSection = await prisma.profileSection.upsert({
      where: { key: 'passport_info' },
      update: {},
      create: { key: 'passport_info', title: { ar: 'معلومات جواز السفر', en: 'Passport information' }, sortOrder: 5 },
    });
    const personalSection = await prisma.profileSection.findUniqueOrThrow({
      where: { key: SECTION_KEYS.PERSONAL_INFO },
    });
    await prisma.fieldDefinition.updateMany({
      where: { sectionId: personalSection.id, key: 'passport_no' },
      data: { sectionId: passportSection.id },
    });
  }

  await seedSection('passport_info', { ar: 'معلومات جواز السفر', en: 'Passport information' }, 5, false, [
    { key: 'passport_no', label: { ar: 'رقم جواز السفر', en: 'Passport number' }, type: 'TEXT', validation: { maxLength: 20 } },
    { key: 'passport_type', label: { ar: 'نوع جواز السفر', en: 'Passport type' }, type: 'SELECT', listKey: LIST_KEYS.PASSPORT_TYPES },
    { key: 'passport_issue_date', label: { ar: 'تاريخ إصدار جواز السفر', en: 'Passport issue date' }, type: 'DATE' },
    { key: 'passport_expiry_date', label: { ar: 'تاريخ انتهاء جواز السفر', en: 'Passport expiry date' }, type: 'DATE' },
    { key: 'passport_issuing_country', label: { ar: 'دولة إصدار جواز السفر', en: 'Passport issuing country' }, type: 'SELECT', listKey: LIST_KEYS.COUNTRIES },
  ]);

  await seedSection('residence_contact', { ar: 'العنوان في تركيا', en: 'Address in Turkey' }, 6, false, [
    { key: 'turkey_address', label: { ar: 'العنوان الحالي في تركيا', en: 'Current address in Turkey' }, type: 'TEXTAREA', validation: { maxLength: 500 } },
  ]);

  await seedSection('turkey_university_info', { ar: 'الجامعة في تركيا', en: 'University in Turkey' }, 7, false, [
    { key: 'university_type', label: { ar: 'نوع الجامعة', en: 'University type' }, type: 'SELECT', listKey: LIST_KEYS.UNIVERSITY_TYPES },
    { key: 'enrollment_date', label: { ar: 'تاريخ بدء الدراسة', en: 'Enrollment date' }, type: 'DATE' },
    { key: 'expected_graduation_date', label: { ar: 'تاريخ التخرج المتوقع', en: 'Expected graduation date' }, type: 'DATE' },
    { key: 'university_name', label: { ar: 'اسم الجامعة', en: 'University name' }, type: 'TEXT', validation: { maxLength: 160 } },
    { key: 'university_address', label: { ar: 'عنوان الجامعة', en: 'University address' }, type: 'TEXT', validation: { maxLength: 300 } },
    { key: 'student_number', label: { ar: 'الرقم الجامعي', en: 'Student number' }, type: 'TEXT', validation: { maxLength: 40 } },
    { key: 'faculty', label: { ar: 'الكلية', en: 'Faculty' }, type: 'TEXT', validation: { maxLength: 120 } },
    { key: 'major', label: { ar: 'التخصص', en: 'Major' }, type: 'TEXT', validation: { maxLength: 120 } },
    { key: 'class_year', label: { ar: 'الصف/المستوى الدراسي', en: 'Class/year level' }, type: 'TEXT', validation: { maxLength: 40 } },
    { key: 'insurance_available', label: { ar: 'التأمين الصحي متوفر', en: 'Health insurance available' }, type: 'BOOLEAN' },
    { key: 'insurance_type', label: { ar: 'نوع التأمين', en: 'Insurance type' }, type: 'TEXT', validation: { maxLength: 120, showIf: { field: 'insurance_available', equals: true } } },
  ]);

  // ── starter universities & majors ──
  const universities: Array<{ en: string; ar: string; city: string }> = [
    { en: 'Istanbul University', ar: 'جامعة إسطنبول', city: 'Istanbul' },
    { en: 'Ankara University', ar: 'جامعة أنقرة', city: 'Ankara' },
    { en: 'Marmara University', ar: 'جامعة مرمرة', city: 'Istanbul' },
    { en: 'Ege University', ar: 'جامعة إيجه', city: 'Izmir' },
    { en: 'Sakarya University', ar: 'جامعة سكاريا', city: 'Sakarya' },
  ];
  for (const u of universities) {
    const existing = await prisma.university.findFirst({ where: { name: { path: ['en'], equals: u.en } } });
    if (!existing) {
      await prisma.university.create({
        data: { name: { ar: u.ar, en: u.en }, city: u.city, countryCode: 'TR' },
      });
    }
  }

  const majors: Array<{ en: string; ar: string }> = [
    { en: 'Medicine', ar: 'الطب البشري' },
    { en: 'Dentistry', ar: 'طب الأسنان' },
    { en: 'Pharmacy', ar: 'الصيدلة' },
    { en: 'Computer Engineering', ar: 'هندسة الحاسوب' },
    { en: 'Civil Engineering', ar: 'الهندسة المدنية' },
    { en: 'Business Administration', ar: 'إدارة الأعمال' },
  ];
  for (const m of majors) {
    const existing = await prisma.major.findFirst({ where: { name: { path: ['en'], equals: m.en } } });
    if (!existing) {
      await prisma.major.create({ data: { name: { ar: m.ar, en: m.en } } });
    }
  }

  // ── initial admin user (dev credentials come from env) ──
  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? 'admin@yildirim.local').toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin123!';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      phoneE164: '+900000000000',
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      fullNameAr: 'مدير النظام',
      fullNameEn: 'System Admin',
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });

  // ── dev supervisor account ──
  const supervisorEmail = 'supervisor@yildirim.local';
  const supervisor = await prisma.user.upsert({
    where: { email: supervisorEmail },
    update: {},
    create: {
      email: supervisorEmail,
      phoneE164: '+900000000001',
      passwordHash: await argon2.hash('Supervisor123!', { type: argon2.argon2id }),
      fullNameAr: 'مشرف المفاضلات',
      fullNameEn: 'Placement Supervisor',
      role: 'SUPERVISOR',
      emailVerifiedAt: new Date(),
    },
  });

  // ── sample placement service (published, ranked choices up to 3) ──
  const requiredFields = await prisma.fieldDefinition.findMany({
    where: { isRequiredForProfile: true },
  });
  const service = await prisma.service.upsert({
    where: { slug: 'public-university-placement' },
    update: {},
    create: {
      slug: 'public-university-placement',
      title: { ar: 'مفاضلة الجامعات الحكومية التركية', en: 'Turkish Public University Placement' },
      description: {
        ar: 'قدّم على مقاعد الجامعات الحكومية التركية لفصل خريف ٢٠٢٦. اختر حتى ٣ رغبات مرتبة حسب الأفضلية، وسيتابع مشرفنا طلبك حتى صدور النتيجة.',
        en: 'Apply for Turkish public universities — fall 2026 intake.',
      },
      type: 'UNIVERSITY_PLACEMENT',
      choiceMode: 'MULTI',
      maxChoices: 3,
      isPublished: true,
      publishedAt: new Date(),
      requirements: {
        create: requiredFields.map((f, i) => ({ fieldId: f.id, isRequired: true, sortOrder: i })),
      },
    },
  });
  await prisma.serviceSupervisor.upsert({
    where: { serviceId_userId: { serviceId: service.id, userId: supervisor.id } },
    update: {},
    create: { serviceId: service.id, userId: supervisor.id },
  });

  // ── second realistic service (private universities, single choice) ──
  const privateService = await prisma.service.upsert({
    where: { slug: 'private-university-scholarship' },
    update: {},
    create: {
      slug: 'private-university-scholarship',
      title: { ar: 'منح الجامعات الخاصة التركية', en: 'Turkish Private University Scholarships' },
      description: {
        ar: 'قبولات مخفّضة في الجامعات الخاصة التركية بخصومات تصل إلى ٧٥٪. اختر جامعتك وتخصصك وسنتولى الباقي.',
        en: 'Discounted admissions at Turkish private universities.',
      },
      type: 'UNIVERSITY_PLACEMENT',
      choiceMode: 'SINGLE',
      maxChoices: 1,
      isPublished: true,
      publishedAt: new Date(),
      requirements: {
        create: requiredFields.map((f, i) => ({ fieldId: f.id, isRequired: true, sortOrder: i })),
      },
    },
  });
  await prisma.serviceSupervisor.upsert({
    where: { serviceId_userId: { serviceId: privateService.id, userId: supervisor.id } },
    update: {},
    create: { serviceId: privateService.id, userId: supervisor.id },
  });

  // ── residence permit appointment service (APPOINTMENT outcome kind) ──
  const residenceRequirementKeys: Array<[string, string]> = [
    // [sectionKey, fieldKey]
    [SECTION_KEYS.PERSONAL_INFO, 'birth_date'],
    [SECTION_KEYS.PERSONAL_INFO, 'gender'],
    [SECTION_KEYS.PERSONAL_INFO, 'nationality'],
    [SECTION_KEYS.PERSONAL_INFO, 'place_of_birth'],
    [SECTION_KEYS.PERSONAL_INFO, 'country_of_birth'],
    [SECTION_KEYS.PERSONAL_INFO, 'marital_status'],
    [SECTION_KEYS.PERSONAL_INFO, 'passport_given_name'],
    [SECTION_KEYS.PERSONAL_INFO, 'passport_surname'],
    [SECTION_KEYS.PERSONAL_INFO, 'father_name'],
    [SECTION_KEYS.PERSONAL_INFO, 'mother_name'],
    ['passport_info', 'passport_no'],
    ['passport_info', 'passport_type'],
    ['passport_info', 'passport_issue_date'],
    ['passport_info', 'passport_expiry_date'],
    ['passport_info', 'passport_issuing_country'],
    ['residence_contact', 'turkey_address'],
    ['turkey_university_info', 'university_type'],
    ['turkey_university_info', 'enrollment_date'],
    ['turkey_university_info', 'expected_graduation_date'],
    ['turkey_university_info', 'university_name'],
    ['turkey_university_info', 'university_address'],
    ['turkey_university_info', 'student_number'],
    ['turkey_university_info', 'faculty'],
    ['turkey_university_info', 'major'],
    ['turkey_university_info', 'class_year'],
    ['turkey_university_info', 'insurance_available'],
    [SECTION_KEYS.DOCUMENTS, 'passport_copy'],
  ];
  const residenceFieldIds: string[] = [];
  for (const [sectionKey, fieldKey] of residenceRequirementKeys) {
    const section = await prisma.profileSection.findUniqueOrThrow({ where: { key: sectionKey } });
    const field = await prisma.fieldDefinition.findUniqueOrThrow({
      where: { sectionId_key: { sectionId: section.id, key: fieldKey } },
    });
    residenceFieldIds.push(field.id);
  }

  const residenceService = await prisma.service.upsert({
    where: { slug: 'residence-permit-appointment' },
    update: { config: { outcomeKind: 'APPOINTMENT' } },
    create: {
      slug: 'residence-permit-appointment',
      title: { ar: 'حجز موعد إقامة طلابية', en: 'Student Residence Permit Appointment' },
      description: {
        ar: 'نحجز لك موعد تقديم أوراق الإقامة الطلابية (أول مرة أو تمديد) لدى إدارة الهجرة التركية. أكمل بياناتك ومستنداتك، اختر التفاصيل المطلوبة، وسيؤكد لك مشرفنا الموعد الرسمي.',
        en: 'We book your Turkish student residence permit appointment (first-time or extension).',
      },
      type: 'GENERAL',
      choiceMode: 'SINGLE',
      maxChoices: 1,
      isPublished: true,
      publishedAt: new Date(),
      config: { outcomeKind: 'APPOINTMENT' },
      requirements: {
        create: residenceFieldIds.map((fieldId, i) => ({ fieldId, isRequired: true, sortOrder: i })),
      },
    },
  });
  await prisma.serviceSupervisor.upsert({
    where: { serviceId_userId: { serviceId: residenceService.id, userId: supervisor.id } },
    update: {},
    create: { serviceId: residenceService.id, userId: supervisor.id },
  });

  // service-only one-time questions
  const officesListId = (await prisma.list.findUniqueOrThrow({ where: { key: LIST_KEYS.IMMIGRATION_OFFICES } })).id;
  const regTypesListId = (
    await prisma.list.findUniqueOrThrow({ where: { key: LIST_KEYS.RESIDENCE_REGISTRATION_TYPES } })
  ).id;
  const residenceExtraFields = [
    { key: 'registration_type', label: { ar: 'نوع التسجيل على الإقامة', en: 'Registration type' }, type: 'SELECT' as const, listId: regTypesListId, validation: undefined as Prisma.InputJsonValue | undefined },
    { key: 'duration_months', label: { ar: 'المدة المطلوبة (بالأشهر)', en: 'Requested duration (months)' }, type: 'NUMBER' as const, listId: null, validation: { min: 1, max: 60 } as Prisma.InputJsonValue },
    { key: 'residence_start_date', label: { ar: 'التاريخ المطلوب لبدء الإقامة', en: 'Requested residence start date' }, type: 'DATE' as const, listId: null, validation: undefined },
    { key: 'immigration_office', label: { ar: 'فرع إدارة الهجرة', en: 'Immigration office' }, type: 'SELECT' as const, listId: officesListId, validation: undefined },
    { key: 'submission_datetime', label: { ar: 'التاريخ والساعة المطلوبة لتسليم الأوراق', en: 'Requested submission date & time' }, type: 'DATETIME' as const, listId: null, validation: undefined },
  ];
  for (const [i, f] of residenceExtraFields.entries()) {
    await prisma.serviceExtraField.upsert({
      where: { serviceId_key: { serviceId: residenceService.id, key: f.key } },
      update: { label: f.label, type: f.type, listId: f.listId, validation: f.validation, sortOrder: i },
      create: {
        serviceId: residenceService.id,
        key: f.key,
        label: f.label,
        type: f.type,
        listId: f.listId,
        validation: f.validation,
        isRequired: true,
        sortOrder: i,
      },
    });
  }

  // ── demo student with a COMPLETE profile (real files on the storage disk) ──
  const uploadsRoot = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './.uploads');
  const storeFile = async (ownerUserId: string, kind: 'PROFILE_PHOTO' | 'DOCUMENT', buf: Buffer, originalName: string, mimeType: string) => {
    const storageKey = randomBytes(24).toString('hex');
    const p = resolve(uploadsRoot, storageKey.slice(0, 2), storageKey);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, buf);
    return prisma.storedFile.create({
      data: {
        ownerUserId,
        kind,
        storageKey,
        originalName,
        mimeType,
        sizeBytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
      },
    });
  };

  const demoEmail = 'student.demo@yildirim.local';
  let demo = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!demo) {
    demo = await prisma.user.create({
      data: {
        email: demoEmail,
        phoneE164: '+905301234567',
        passwordHash: await argon2.hash('Student123!', { type: argon2.argon2id }),
        fullNameAr: 'أحمد محمود النجار',
        fullNameEn: 'Ahmad Mahmoud Alnajjar',
        role: 'STUDENT',
        emailVerifiedAt: new Date(),
      },
    });

    const photoBuf = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 31, g: 42, b: 92 } },
    })
      .jpeg({ quality: 85 })
      .toBuffer();
    const photo = await storeFile(demo.id, 'PROFILE_PHOTO', photoBuf, 'photo.jpg', 'image/jpeg');
    await prisma.user.update({ where: { id: demo.id }, data: { profilePhotoFileId: photo.id } });

    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF',
    );

    const allFields = await prisma.fieldDefinition.findMany({ include: { section: true } });
    const byKey = new Map(allFields.map((f) => [f.key, f]));
    const scalarValues: Array<[string, unknown]> = [
      ['birth_date', '2006-11-02'],
      ['gender', 'male'],
      ['nationality', 'SY'],
      ['residence_country', 'TR'],
      ['passport_no', 'N01234567'],
      ['degree_level', 'high_school'],
      ['high_school_gpa', 88.4],
      ['graduation_year', 2024],
    ];
    for (const [key, value] of scalarValues) {
      const field = byKey.get(key);
      if (!field) continue;
      await prisma.profileFieldValue.create({
        data: { userId: demo.id, fieldId: field.id, entryIndex: 0, value: value as Prisma.InputJsonValue },
      });
    }
    for (const key of ['passport_copy', 'high_school_certificate', 'transcript']) {
      const field = byKey.get(key);
      if (!field) continue;
      const doc = await storeFile(demo.id, 'DOCUMENT', pdf, `${key}.pdf`, 'application/pdf');
      await prisma.profileFieldValue.create({
        data: { userId: demo.id, fieldId: field.id, entryIndex: 0, fileId: doc.id },
      });
    }

    // submitted application against the private-universities service
    const uni = await prisma.university.findFirstOrThrow();
    const major = await prisma.major.findFirstOrThrow();
    const snapshot = {
      takenAt: new Date().toISOString(),
      student: {
        fullNameAr: demo.fullNameAr,
        fullNameEn: demo.fullNameEn,
        email: demo.email,
        phone: demo.phoneE164,
        photoFileId: photo.id,
      },
      answers: await Promise.all(
        requiredFields.map(async (f) => {
          const v = await prisma.profileFieldValue.findUnique({
            where: { userId_fieldId_entryIndex: { userId: demo!.id, fieldId: f.id, entryIndex: 0 } },
            include: { file: true },
          });
          return {
            fieldKey: f.key,
            label: f.label,
            type: f.type,
            value: v?.value ?? null,
            fileId: v?.fileId ?? null,
            fileName: v?.file?.originalName ?? null,
          };
        }),
      ),
    };
    const year = new Date().getFullYear();
    const count = await prisma.request.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });
    const request = await prisma.request.create({
      data: {
        referenceNo: `YLD-${year}-${String(count + 1).padStart(6, '0')}`,
        serviceId: privateService.id,
        studentId: demo.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        answersSnapshot: snapshot as Prisma.InputJsonValue,
        choices: { create: [{ rank: 1, universityId: uni.id, majorId: major.id }] },
      },
    });
    await prisma.requestStatusHistory.create({
      data: { requestId: request.id, fromStatus: null, toStatus: 'SUBMITTED', changedByUserId: demo.id },
    });
    await prisma.notification.create({
      data: {
        userId: supervisor.id,
        type: 'request.submitted',
        title: { ar: 'طلب جديد بانتظار المراجعة' },
        body: { ar: `طلب جديد رقم ${request.referenceNo}` },
        data: { requestId: request.id },
      },
    });
    console.log(`Demo student seeded with request ${request.referenceNo}`);
  }

  // ── demo student: residence-related values (idempotent, runs every seed so
  //    existing dev DBs gain the new fields and stay eligible for the service) ──
  if (demo) {
    const residenceDemoValues: Array<[string, string, unknown]> = [
      // [sectionKey, fieldKey, value]
      [SECTION_KEYS.PERSONAL_INFO, 'place_of_birth', 'حلب'],
      [SECTION_KEYS.PERSONAL_INFO, 'country_of_birth', 'SY'],
      [SECTION_KEYS.PERSONAL_INFO, 'marital_status', 'single'],
      [SECTION_KEYS.PERSONAL_INFO, 'passport_given_name', 'Ahmad'],
      [SECTION_KEYS.PERSONAL_INFO, 'passport_surname', 'Alnajjar'],
      [SECTION_KEYS.PERSONAL_INFO, 'father_name', 'محمود'],
      [SECTION_KEYS.PERSONAL_INFO, 'mother_name', 'فاطمة'],
      ['passport_info', 'passport_type', 'ordinary'],
      ['passport_info', 'passport_issue_date', '2023-05-10'],
      ['passport_info', 'passport_expiry_date', '2029-05-09'],
      ['passport_info', 'passport_issuing_country', 'SY'],
      ['residence_contact', 'turkey_address', 'Fatih, Akşemsettin Mah. No: 12, İstanbul'],
      ['turkey_university_info', 'university_type', 'state'],
      ['turkey_university_info', 'enrollment_date', '2025-09-15'],
      ['turkey_university_info', 'expected_graduation_date', '2029-06-30'],
      ['turkey_university_info', 'university_name', 'İstanbul Üniversitesi'],
      ['turkey_university_info', 'university_address', 'Beyazıt, Fatih/İstanbul'],
      ['turkey_university_info', 'student_number', '0102230045'],
      ['turkey_university_info', 'faculty', 'كلية الطب'],
      ['turkey_university_info', 'major', 'الطب البشري'],
      ['turkey_university_info', 'class_year', 'الأولى'],
      ['turkey_university_info', 'insurance_available', true],
      ['turkey_university_info', 'insurance_type', 'تأمين طلابي خاص'],
    ];
    for (const [sectionKey, fieldKey, value] of residenceDemoValues) {
      const section = await prisma.profileSection.findUnique({ where: { key: sectionKey } });
      if (!section) continue;
      const field = await prisma.fieldDefinition.findUnique({
        where: { sectionId_key: { sectionId: section.id, key: fieldKey } },
      });
      if (!field) continue;
      await prisma.profileFieldValue.upsert({
        where: { userId_fieldId_entryIndex: { userId: demo.id, fieldId: field.id, entryIndex: 0 } },
        update: {},
        create: { userId: demo.id, fieldId: field.id, entryIndex: 0, value: value as Prisma.InputJsonValue },
      });
    }
  }

  // ── default site settings + legal placeholders (only if unset) ──
  const existingSite = await prisma.appSetting.findUnique({ where: { key: SITE_SETTINGS_KEY } });
  if (!existingSite) {
    const site: SiteSettings = {
      ...DEFAULT_SITE_SETTINGS,
      contact: {
        phone: '+90 501 000 0000',
        email: 'info@yildirim.com.tr',
        whatsapp: '+90 501 000 0000',
        address: 'إسطنبول، تركيا',
      },
      social: {
        facebook: 'https://facebook.com/',
        instagram: 'https://instagram.com/',
        tiktok: '',
        youtube: 'https://youtube.com/',
        twitter: '',
        telegram: 'https://t.me/',
      },
      newsletterEnabled: true,
      copyright: {
        text: 'جميع الحقوق محفوظة © يلدريم للخدمات التعليمية',
        url: '',
      },
    };
    await prisma.appSetting.create({ data: { key: SITE_SETTINGS_KEY, value: site as object } });
    await prisma.appSetting.create({
      data: {
        key: LEGAL_KEY.privacy,
        value: {
          title: 'سياسة الخصوصية',
          body: 'نحن في يلدريم نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. تُستخدم بياناتك ومستنداتك حصراً لغرض معالجة طلباتك التعليمية ولا تُشارك مع أي جهة خارجية دون موافقتك.',
          pdfFileId: null,
        },
      },
    });
    await prisma.appSetting.create({
      data: {
        key: LEGAL_KEY.terms,
        value: {
          title: 'الشروط والأحكام',
          body: 'باستخدامك لمنصة يلدريم فإنك توافق على تقديم بيانات صحيحة، والالتزام بمتطلبات كل خدمة. تحتفظ المنصة بحق مراجعة الطلبات والمستندات المرفوعة قبل اعتمادها.',
          pdfFileId: null,
        },
      },
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
