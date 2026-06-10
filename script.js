function getPageId() {
    const filename = window.location.pathname.split('/').pop().replace('.html', '');
    return filename === '' ? 'contact' : filename;
}

const templates = {
    contact: (channel) => {
        return `สวัสดีครับ 🙇🏻 โอ๊ค จากบริษัทไดร์ฟครับ\n\nพอดีติดตามคอนเทนต์ของคุณใน TikTok จากช่อง (${channel}) แล้วรู้สึกว่าสไตล์ช่องน่าสนใจมากครับ 😊\n\n ตอนนี้ทางเรากำลังหา Creator ร่วมรีวิวสินค้าของแบรนด์ เลยอยากขออนุญาตสอบถามว่าพอสนใจรับงานแนว Affiliate / Commission ไหมครับ\n\nทางเราจะส่งสินค้าให้ทดลองใช้ฟรีครับ\n\nและมีค่าคอมจากยอดขายผ่าน TikTok Shop ให้ครับ ✨\n\nรีวิวในสไตล์ของตัวเองได้เต็มที่เลยครับ\n\nผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง (Instagram) แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻\n\nหากสนใจ เดี๋ยวโอ๊คส่งรายละเอียดเพิ่มเติมให้ได้เลยครับ 🙏🏻`;
    },
    gmail: (channel) => {
        return `เรียน คุณ (${channel})\n\nสวัสดีครับ ผม (โอ๊ค) ติดต่อจาก แบรนด์ Drive บริษัทไดร์ฟจำกัดนะครับ\n\nพอดีผมมีโอกาสได้ติดตามผลงานของคุณ (${channel}) ผ่านทาง (TikTok) แล้วรู้สึกสนใจในการทำคลิปมากๆ เลยครับ เลยตั้งใจอีเมลมาทักทายและขออนุญาตขอช่องทางติดต่อ Connection เพื่อพูดคุยเกี่ยวกับงาน\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า ทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% (สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\nรีวิว สไตล์คุณ ได้เลยเต็มที่\n(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nยินดีที่ได้รู้จักอย่างเป็นทางการผ่านทาง Gmail นะครับ หากคุณ (${channel}) สามารถทักมาพูดคุยกันได้ตลอดเลยครับ ยินดีมากๆ ครับ\n\nขอให้เป็นสัปดาห์ที่ดีและราบรื่นนะครับ\n\nขอแสดงความนับถือ\n(โอ๊ค)\n(ช่องทางติดต่อ Line : 0641607169)`;
    },
    tiktok: (channel) => {
        return `สวัสดีครับผม โอ๊ค จากบริษัทไดรฟ์จำกัดครับ มาติดงานรีวิวสินค้าตัวใหม่ของทางแบรนด์ ชื่อ Sereniz(เซเรไนท์) เป็นแม็กนีเซียมปรับสมดุลการนอนครับ ผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง Instagram แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻 (พอดีค้นหาไลน์ไม่เจอครับ)`;
    },
    buyasset: (channel, budget) => {
        const b = budget || 500;
        return `สวัสดีครับ โอ๊คนะครับ ติดต่อจาก แบรนด์ Drive บริษัท ไดร์ฟ จำกัด ครับ 🙏\n\nได้เห็นผลงานผ่านช่อง TikTok จากช่อง (${channel}) ทางแบรนด์จึงมีความสนใจ Asset คลิป Influencer หรือซื้อคลิป โดยการจัดทำคลิปวิดีโอรีวิวสินค้า เพื่อนำไปเผยแพร่บนช่องทางของแบรนด์โดยตรง\n(ไม่ต้องโพสต์ลงช่องทางส่วนตัวของคุณนะครับ)\n\nสินค้า: Sereniz ผลิตภัณฑ์เสริมอาหาร\n🔗 https://vt.tiktok.com/ZS9eUvXJDCM39-gqR5D/\n\n✨ รายละเอียดงาน (SOW)\n* จัดทำคลิปวิดีโอรีวิวสินค้า 1 คลิป โดยไม่ต้องใส่ Taxt\n* ความยาวประมาณ 1 นาที (ไม่ต่ำกว่า 45 วินาที) มีการพากย์เสียง\n* ใช้สำหรับลงทุกช่องทางของแบรนด์\n* ถ่ายทำตามบรีฟของทางแบรนด์ (สามารถปรับสไตล์ให้เหมาะกับตัวคุณได้ค่ะ)\n* ส่ง Draft แรกภายใน 3–5 วัน หลังจากได้รับสินค้า\n* ทางแบรนด์ขอสิทธิ์แก้ไขงานได้ไม่เกิน 3 ครั้ง\n\n💰Budget : 500 บาท\n\nหากสนใจ สามารถแจ้งเรท / สอบถามรายละเอียดเพิ่มเติมได้เลยนะครับ
ขอบคุณมากครับ 🙏✨`;
    },
    sereniz: (channel) => {
        return `สวัสดีครับ ขออนุญาตแนะนำตัวนะครับ โอ๊ค จากบริษัทไดร์ฟจำกัด\n\nโอ๊ค ติดตามมาจากช่อง (${channel}) ทาง Tiktok ครับ\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า เห็นทางช่องน่าสนใจทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% 📌(สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\n📸 รีวิว สไตล์คุณ ได้เลยเต็มที่\n\n❌(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nทางเราตามหา Influencer ที่สื่อมีความเกี่ยวข้องกับสินค้าของเราครับ\n\nคลิปตัวอย่างของอินฟูที่รีวิวสินค้าของทางเราครับ😊❤️\n\nhttps://vt.tiktok.com/ZSmLS9141/\nhttps://vt.tiktok.com/ZSmX2r8aa/\nhttps://vt.tiktok.com/ZSmX2SB3F/\n\n📌สินค้าของเราจะเป็นอาหารเสริมสนับสนุนการนอน Sereniz 💤 🛌นะครับ Link Tiktok โปรไฟล์ร้านของเราบน tiktok ชื่อ driveonline\n\nhttps://www.tiktok.com/@drive.officialth?_r=1&_t=ZS-96GW3KfWI8D\n\nสามารถเข้าดูสินค้าได้ที่หน้าโปรไฟล์เราก่อนตัดสินใจนะครับ หากสนใจหรือมีข้อมูลสอบถามเพิ่มเติมแจ้งกลับ โอ๊ค ได้เลยนะครับ 🥰🙇🏻`;
    }
};

function getBudget() {
    const bInput = document.getElementById('budgetInput');
    const raw = bInput ? (bInput.value || '').trim() : '';
    if (!raw) return '500 บาท';
    if (/^\d+$/.test(raw)) {
        return `${raw} บาท`;
    }
    return raw;
}

function getTemplate(channel) { 
    const pageId = getPageId();
    const templateFunc = templates[pageId];
    if (!templateFunc) return '';
    const t = templateFunc(channel);
    if (pageId === 'buyasset') {
        const b = getBudget();
        return t.replace(/💰Budget\s*:\s*.*/m, `💰Budget : ${b}`);
    }
    return t;
}

function updateScript() {
    const input = document.getElementById('channelInput');
    const ch = input ? input.value.trim() || '(ชื่อช่อง)' : '(ชื่อช่อง)';
    const full = getTemplate(ch);
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedCh = esc(ch);
    const b = getBudget();
    const escapedB = esc(b);
    let rendered = esc(full).replaceAll(escapedCh, `<span class="hl">${escapedCh}</span>`);
    rendered = rendered.replaceAll(escapedB, `<span class="hl">${escapedB}</span>`);
    document.getElementById('scriptPreview').innerHTML = rendered;

    const pageId = getPageId();
    if (input) {
        localStorage.setItem(`savedChannel_${pageId}`, ch);
    }
    const bInput = document.getElementById('budgetInput');
    if (bInput) {
        localStorage.setItem(`savedBudget_${pageId}`, bInput.value.trim());
    }
}

function copyMain() {
    const input = document.getElementById('channelInput');
    const ch = input ? input.value.trim() || '(ชื่อช่อง)' : '(ชื่อช่อง)';
    copyText(getTemplate(ch), 'copyBtn1');
}

let toastTimer;
function showToast() {
    clearTimeout(toastTimer);
    const t = document.getElementById('toast');
    t.classList.add('show');
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function copyText(text, btnId) {
    navigator.clipboard.writeText(text).then(() => {
        showToast();
        if (btnId) {
            const btn = document.getElementById(btnId);
            const orig = btn.innerHTML;
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> คัดลอกแล้ว';
            btn.classList.add('copied');
            setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
        }
    });
}

window.onload = () => {
    const pageId = getPageId();
    const saved = localStorage.getItem(`savedChannel_${pageId}`);
    const input = document.getElementById('channelInput');
    if (input && saved && saved !== '(ชื่อช่อง)') {
        input.value = saved;
    }
    const savedB = localStorage.getItem(`savedBudget_${pageId}`);
    const bInput = document.getElementById('budgetInput');
    if (bInput && savedB) {
        bInput.value = savedB;
    }
    updateScript();
};

document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll(".nav-item");

    navLinks.forEach(link => {
        const linkPage = link.getAttribute("href");

        if (currentPage === linkPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }

        if (currentPage === "" && linkPage === "sereniz.html") {
            link.classList.add("active");
        }
    });
});