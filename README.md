# آمادگی آزمون شایستگی — مسیر Laravel

جزوه کامل و ردیاب پیشرفت برای ۵ آزمون شایستگی تخصصی (۲۵ مبحث)، به‌صورت یک سایت استاتیک HTML/CSS/JS بدون build step.

**نسخه آنلاین:** https://4h1r.github.io/laravel-exam-prep/

| آزمون | زمان | مباحث |
|---|---|---|
| ۲ — Back مقدماتی | چهارشنبه ۲۰ آبان، ۸:۰۰–۱۰:۰۰ | MongoDB · Database Design · Protocols · REST API · Algorithms |
| ۳ — Back پیشرفته | چهارشنبه ۲۰ آبان، ۱۰:۱۵–۱۲:۱۵ | Advanced DB · Scaled Apps · Code Optimization · OS & Infra · System Design |
| ۵ — Framework | چهارشنبه ۲۰ آبان، ۱۲:۴۵–۱۴:۴۵ | PHP · Laravel Basics · Laravel Deeper · Eloquent · Design Patterns |
| ۱ — برنامه‌نویسی | پنجشنبه ۲۱ آبان، ۸:۰۰–۱۰:۰۰ | OWASP · Software Design · Testing · Documentation · Git |
| ۴ — مشترک سایر حوزه‌ها | پنجشنبه ۲۱ آبان، ۱۰:۱۵–۱۲:۱۵ | CI/CD · Docker · HTTP/HTML/CSS/JS · Monitoring · Scripting |

## امکانات
- هر مبحث: درس‌های بخش‌بندی‌شده، نکته‌های امتحانی، سوالات تشریحی با جواب نمونه، خلاصه برای مرور سریع
- تیک «خواندم» برای هر بخش + نوار پیشرفت مبحث/آزمون/کل
- ارزیابی سوال‌ها (بلد بودم / نیاز به مرور) و لیست مرور در داشبورد
- شمارش معکوس تا آزمون بعدی، تم روشن/تیره، خروجی/ورودی پیشرفت (JSON)
- پیشرفت در `localStorage` مرورگر ذخیره می‌شود

## توسعه
```bash
# بعد از اضافه/ویرایش صفحه‌ای در topics/
node scripts/build-manifest.mjs
```
ساختار صفحه جدید: `topics/_template.html` · فهرست آزمون‌ها: `data/catalog.json`
