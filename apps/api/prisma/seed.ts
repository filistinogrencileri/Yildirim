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
    { key: 'passport_no', label: { ar: 'رقم جواز السفر', en: 'Passport number' }, type: 'TEXT', required: false, validation: { maxLength: 20 } },
  ]);

  await seedSection(SECTION_KEYS.ACADEMIC_INFO, { ar: 'المعلومات الأكاديمية', en: 'Academic info' }, 2, false, [
    { key: 'degree_level', label: { ar: 'المرحلة الدراسية الحالية', en: 'Current degree level' }, type: 'SELECT', required: true, listKey: LIST_KEYS.DEGREE_LEVELS },
    { key: 'high_school_gpa', label: { ar: 'معدل الشهادة الثانوية (%)', en: 'High-school GPA (%)' }, type: 'NUMBER', required: true, validation: { min: 0, max: 100 } },
    { key: 'graduation_year', label: { ar: 'سنة التخرج', en: 'Graduation year' }, type: 'NUMBER', required: true, validation: { min: 1990, max: 2035 } },
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
