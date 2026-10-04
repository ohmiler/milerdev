# UX backlog (wayfinder specimens)

ร่างการวางแผน UX แยกตาม journey ที่เจ้าของเขียนไว้ ใช้เป็น backlog สำหรับงานปรับ UX/UI ทีละส่วน
ทุกไฟล์ยังอยู่ในสถานะ "รอความเห็นจาก owner" จึงเป็นข้อเสนอ ไม่ใช่ข้อตกลงที่ใช้แล้ว
ผล audit UX/UI วันที่ 4 ตุลาคม 2569 และลำดับงานที่แนะนำอยู่ใน artifact "MilerDev UX Audit"

| Journey | ไฟล์ |
| --- | --- |
| การหาคอร์สและเนื้อหาก่อนตัดสินใจ | [acquisition-content-journey-specimen.md](acquisition-content-journey-specimen.md) |
| แคตตาล็อก คอร์ส และ bundle | [catalog-course-bundle-discovery-specimen.md](catalog-course-bundle-discovery-specimen.md) |
| การลงทะเบียนและการชำระเงิน | [enrollment-payment-clarity-specimen.md](enrollment-payment-clarity-specimen.md) |
| สมัคร เข้าสู่ระบบ และกู้รหัสผ่าน | [authentication-recovery-friction-specimen.md](authentication-recovery-friction-specimen.md) |
| หน้าเรียนและการเรียนต่อ | [learning-workspace-continuity-specimen.md](learning-workspace-continuity-specimen.md) |
| บัญชีผู้เรียนและใบรับรอง | [learner-account-certificate-journey-specimen.md](learner-account-certificate-journey-specimen.md) |
| navigation และโครงหน้าร่วม | [navigation-global-shell-specimen.md](navigation-global-shell-specimen.md) |
| ความสม่ำเสมอของหน้าตา | [visual-consistency-specimen.md](visual-consistency-specimen.md) |
| การ rollout และการวัดผล | [rollout-acceptance-measurement-specimen.md](rollout-acceptance-measurement-specimen.md), [rollout-measurement-research.md](rollout-measurement-research.md) |

## อ่านคู่กับการเปลี่ยนแปลงหลังเขียนร่าง

- ระบบวัดผลและ consent ถูกตัดออกแล้วตาม ADR 0011 ข้อ 5 (#165–#169) ส่วนที่อ้างถึง analytics events, web vitals, measurement outbox หรือ consent ในไฟล์ rollout และ measurement จึงใช้ไม่ได้แล้ว ให้ใช้รายงานแอดมินและ Search Console แทน
- ฟีเจอร์ Blog, Announcements, Notifications และ Coupons ถูกตัดออกแล้ว (#161–#164) ข้อเสนอที่พึ่งฟีเจอร์เหล่านี้ต้องปรับก่อนใช้
- ลิงก์ไปไฟล์โค้ดที่ถูกลบแสดงเป็นข้อความพร้อม "(removed)"
