// Database of outreach templates
const templates = {
    sereniz: {
        title: "💤 Sereniz Outreach (Commission 10%)",
        badge: "TikTok Shop",
        showBudget: false,
        steps: [
            {
                label: "แนะนำตัว (Introduction)",
                filename: "sereniz-intro.txt",
                template: (ch) => `สวัสดีครับ ขออนุญาตแนะนำตัวนะครับ โอ๊ค จากบริษัทไดร์ฟจำกัด\n\nโอ๊ค ติดตามมาจากช่อง (${ch}) ทาง Tiktok ครับ\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า เห็นทางช่องน่าสนใจทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% 📌(สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\n📸 รีวิว สไตล์คุณ ได้เลยเต็มที่\n\n❌(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nทางเราตามหา Influencer ที่สื่อมีความเกี่ยวข้องกับสินค้าของเราครับ\n\nคลิปตัวอย่างของอินฟูที่รีวิวสินค้าของทางเราครับ😊❤️\n\nhttps://vt.tiktok.com/ZSmLS9141/\nhttps://vt.tiktok.com/ZSmX2r8aa/\nhttps://vt.tiktok.com/ZSmX2SB3F/\n\n📌สินค้าของเราจะเป็นอาหารเสริมสนับสนุนการนอน Sereniz 💤 🛌นะครับ Link Tiktok โปรไฟล์ร้านของเราบน tiktok ชื่อ driveonline\n\nhttps://www.tiktok.com/@drive.officialth?_r=1&_t=ZS-96GW3KfWI8D\n\nสามารถเข้าดูสินค้าได้ที่หน้าโปรไฟล์เราก่อนตัดสินใจนะครับ หากสนใจหรือมีข้อมูลสอบถามเพิ่มเติมแจ้งกลับ โอ๊ค ได้เลยนะครับ 🥰🙇🏻`
            },
            {
                label: "รายละเอียดสินค้า (Product Details)",
                filename: "product-detail.txt",
                template: () => `ตัวนี้จะเป็น แม็กนีเซียมปรับสมดุลการนอนครับ เป็นสินค้าตัวใหม่ของทางแบรนด์ครับ🙏🏻🙇🏻`
            },
            {
                label: "ปิดท้าย (Closing)",
                filename: "closing.txt",
                template: () => `ผมแจ้งรายละเอียดครบแล้วนะครับ หากสนใจผมสามารถส่งคำเชิญสินค้าให้ได้เลยนะครับ หลังจากตัดสินใจแล้วหากสนใจหรือไม่สนใจ ผมรบกวนแจ้งผมกลับนิดนึงครับ ขอบคุณมากๆครับ🥰🙏🏻🙇🏻`
            },
            {
                label: "ลิงก์สินค้า (Product Link)",
                filename: "product-link.txt",
                template: () => `https://vt.tiktok.com/ZS924jotvLu92-8DVQg/`
            }
        ]
    },
    contact: {
        title: "📞 Contact (Affiliate/Commission)",
        badge: "TikTok",
        showBudget: false,
        steps: [
            {
                label: "สคริปต์เสนอร่วมงาน (Outreach Script)",
                filename: "contact-outreach.txt",
                template: (ch) => `สวัสดีครับ 🙇🏻 โอ๊ค จากบริษัทไดร์ฟครับ\n\nพอดีติดตามคอนเทนต์ของคุณใน TikTok จากช่อง (${ch}) แล้วรู้สึกว่าสไตล์ช่องน่าสนใจมากครับ 😊\n\n ตอนนี้ทางเรากำลังหา Creator ร่วมรีวิวสินค้าของแบรนด์ เลยอยากขออนุญาตสอบถามว่าพอสนใจรับงานแนว Affiliate / Commission ไหมครับ\n\nทางเราจะส่งสินค้าให้ทดลองใช้ฟรีครับ\n\nและมีค่าคอมจากยอดขายผ่าน TikTok Shop ให้ครับ ✨\n\nรีวิวในสไตล์ของตัวเองได้เต็มที่เลยครับ\n\nผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง (Instagram) แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻\n\nหากสนใจ เดี๋ยวโอ๊คส่งรายละเอียดเพิ่มเติมให้ได้เลยครับ 🙏🏻`
            }
        ]
    },
    gmail: {
        title: "📧 Gmail Outreach Letter",
        badge: "Email Business",
        showBudget: false,
        steps: [
            {
                label: "จดหมายเชิญร่วมงานอย่างเป็นทางการ (Official Invitation)",
                filename: "gmail-outreach.txt",
                template: (ch) => `เรียน คุณ (${ch})\n\nสวัสดีครับ ผม (โอ๊ค) ติดต่อจาก แบรนด์ Drive บริษัทไดร์ฟจำกัดนะครับ\n\nพอดีผมมีโอกาสได้ติดตามผลงานของคุณ (${ch}) ผ่านทาง (TikTok) แล้วรู้สึกสนใจในการทำคลิปมากๆ เลยครับ เลยตั้งใจอีเมลมาทักทายและขออนุญาตขอช่องทางติดต่อ Connection เพื่อพูดคุยเกี่ยวกับงาน\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า ทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% (สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\nรีวิว สไตล์คุณ ได้เลยเต็มที่\n(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nยินดีที่ได้รู้จักอย่างเป็นทางการผ่านทาง Gmail นะครับ หากคุณ (${ch}) สามารถทักมาพูดคุยกันได้ตลอดเลยครับ ยินดีมากๆ ครับ\n\nขอให้เป็นสัปดาห์ที่ดีและราบรื่นนะครับ\n\nขอแสดงความนับถือ\n(โอ๊ค)\n(ช่องทางติดต่อ Line : 0641607169)`
            }
        ]
    },
    tiktok: {
        title: "💬 TikTok Quick Direct Message",
        badge: "TikTok DM",
        showBudget: false,
        steps: [
            {
                label: "สคริปต์ทักทายด่วน (Quick DM Script)",
                filename: "tiktok-dm.txt",
                template: () => `สวัสดีครับผม โอ๊ค จากบริษัทไดรฟ์จำกัดครับ มาติดงานรีวิวสินค้าตัวใหม่ของทางแบรนด์ ชื่อ Sereniz(เซเรไนท์) เป็นแม็กนีเซียมปรับสมดุลการนอนครับ ผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง Instagram แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻 (พอดีค้นหาไลน์ไม่เจอครับ)`
            }
        ]
    },
    buyasset: {
        title: "🪙 Buy Asset (ซื้อสิทธิ์การใช้คลิป)",
        badge: "Paid Campaign",
        showBudget: true,
        steps: [
            {
                label: "แนะนำตัว & ข้อตกลง SOW (Intro & SOW)",
                filename: "buy-asset-intro.txt",
                template: (ch, budget) => `สวัสดีครับ โอ๊คนะครับ ติดต่อจาก แบรนด์ Drive บริษัท ไดร์ฟ จำกัด ครับ 🙏\n\nได้เห็นผลงานผ่านช่อง TikTok จากช่อง (${ch}) ทางแบรนด์จึงมีความสนใจ Asset คลิป Influencer หรือซื้อคลิป โดยการจัดทำคลิปวิดีโอรีวิวสินค้า เพื่อนำไปเผยแพร่บนช่องทางของแบรนด์โดยตรง\n(ไม่ต้องโพสต์ลงช่องทางส่วนตัวของคุณนะครับ)\n\nสินค้า: Sereniz ผลิตภัณฑ์เสริมอาหาร\n🔗 https://vt.tiktok.com/ZS9eUvXJDCM39-gqR5D/\n\n✨ รายละเอียดงาน (SOW)\n* จัดทำคลิปวิดีโอรีวิวสินค้า 1 คลิป โดยไม่ต้องใส่ Text\n* ความยาวประมาณ 1 นาที (ไม่ต่ำกว่า 45 วินาที) มีการพากย์เสียง\n* ใช้สำหรับลงทุกช่องทางของแบรนด์\n* ถ่ายทำตามบรีฟของทางแบรนด์ (สามารถปรับสไตล์ให้เหมาะกับตัวคุณได้ค่ะ)\n* ส่ง Draft แรกภายใน 3–5 วัน หลังจากได้รับสินค้า\n* ทางแบรนด์ขอสิทธิ์แก้ไขงานได้ไม่เกิน 3 ครั้ง\n\n💰Budget : ${budget} บาท\n\nหากสนใจ สามารถแจ้งเรท / สอบถามรายละเอียดเพิ่มเติมได้เลยนะครับ\nขอบคุณมากครับ 🙏✨`
            },
            {
                label: "คำถามเช็คความพร้อม (Contract Inquiry)",
                filename: "buy-asset-question.txt",
                template: () => `สะดวกเซ็นสัญญาแจ้งงานไหมครับ`
            },
            {
                label: "สัญญาจ้างงาน (Employment Contract)",
                filename: "buy-asset-contract.txt",
                template: () => `ส่วนนี้เป็นสัญญาครับผม หากมีตรงไหนสงสัยถามผมได้เลยนะครับ`
            },
            {
                label: "ขอที่อยู่ส่งของ/สินค้า (Delivery Details)",
                filename: "buy-asset-address.txt",
                template: () => `ขอชื่อที่อยู่เบอร์โทรสำหรับส่งสินค้าหน่อยครับ`
            },
            {
                label: "ลิงก์บรีฟข้อมูลสินค้า (Canva Brief Link)",
                filename: "buy-asset-brief.txt",
                template: () => `https://www.canva.com/design/DAHCHKdovR4/kctPkJYZTbcJ14eMN8Qo7A/edit\nส่วนนี้จะเป็นบรีฟงานและข้อมูลสินค้าครับผม🙏✨`
            }
        ]
    }
};

// Detect current page file to set campaign
function getPageId() {
    const filename = window.location.pathname.split('/').pop().replace('.html', '');
    return (filename === '' || filename === 'index') ? 'sereniz' : filename;
}

// Global State
let currentCampaign = getPageId();
let channelName = '';
let budgetValue = '';
let checkedStates = {};
let viewMode = 'grid';
let currentFlowStep = 0;

// Initialize on window load
window.addEventListener('DOMContentLoaded', () => {
    // Determine campaign from filename
    currentCampaign = getPageId();

    // Set active class in navbar
    const activeNavBtn = document.getElementById(`nav-${currentCampaign}`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active');
    }

    // Load saved inputs globally
    channelName = localStorage.getItem('global_channel') || '';
    budgetValue = localStorage.getItem('global_budget') || '500';
    viewMode = localStorage.getItem('global_view_mode') || 'grid';

    const chInput = document.getElementById('sidebarChannel');
    const bInput = document.getElementById('sidebarBudget');
    
    if (chInput) chInput.value = channelName;
    if (bInput) bInput.value = budgetValue;

    // Set view toggle buttons
    setViewMode(viewMode);

    // Toggle budget input visibility based on campaign requirements
    toggleBudgetField(templates[currentCampaign].showBudget);

    // Load checkboxes state
    const savedChecked = localStorage.getItem('global_checked_states');
    if (savedChecked) {
        try {
            checkedStates = JSON.parse(savedChecked);
        } catch(e) {}
    }

    renderActiveCampaign();
});

// Sync inputs globally via localStorage
function handleInputSync(inputEl, type) {
    const val = inputEl.value;
    if (type === 'channel') {
        channelName = val;
        localStorage.setItem('global_channel', val);
    } else if (type === 'budget') {
        budgetValue = val;
        localStorage.setItem('global_budget', val);
    }
    renderActiveCampaign();
}

// Toggle sidebar budget field display
function toggleBudgetField(show) {
    const el = document.getElementById('budgetInputContainer');
    if (el) {
        el.style.display = show ? 'block' : 'none';
    }
}

// Set View Mode (Grid vs Flow)
function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('global_view_mode', mode);

    const gridBtn = document.getElementById('view-grid-btn');
    const flowBtn = document.getElementById('view-flow-btn');
    const stepperEl = document.getElementById('flowStepperContainer');

    if (gridBtn && flowBtn) {
        if (mode === 'grid') {
            gridBtn.classList.add('active');
            flowBtn.classList.remove('active');
            if (stepperEl) stepperEl.style.display = 'none';
        } else {
            gridBtn.classList.remove('active');
            flowBtn.classList.add('active');
            if (stepperEl) stepperEl.style.display = 'flex';
        }
    }

    renderActiveCampaign();
}

// Render active campaign contents
function renderActiveCampaign() {
    const data = templates[currentCampaign];
    if (!data) return;

    const titleEl = document.getElementById('activeCampaignTitle');
    if (titleEl) {
        titleEl.innerHTML = `${data.title} <span class="campaign-badge">${data.badge}</span>`;
    }

    const container = document.getElementById('scriptCardsContainer');
    const stepperContainer = document.getElementById('flowStepperContainer');
    
    if (!container) return;
    container.innerHTML = '';
    
    if (stepperContainer) stepperContainer.innerHTML = '';

    let totalSteps = data.steps.length;
    let completedSteps = 0;

    const displayChannel = channelName.trim() || '(ชื่อช่อง)';
    let displayBudget = budgetValue.trim();
    if (!displayBudget) {
        displayBudget = '500 บาท';
    } else if (/^\d+$/.test(displayBudget)) {
        displayBudget = `${displayBudget} บาท`;
    }

    // Adjust step limits
    if (currentFlowStep >= totalSteps) {
        currentFlowStep = totalSteps - 1;
    }
    if (currentFlowStep < 0) currentFlowStep = 0;

    // Render stepper bar for Flow mode
    if (viewMode === 'flow' && stepperContainer) {
        data.steps.forEach((step, idx) => {
            const key = `${currentCampaign}_${idx}`;
            const isChecked = !!checkedStates[key];

            const stepItem = document.createElement('div');
            stepItem.className = `stepper-item ${idx === currentFlowStep ? 'active' : ''} ${isChecked ? 'completed' : ''}`;
            stepItem.onclick = () => { currentFlowStep = idx; renderActiveCampaign(); };
            stepItem.innerHTML = `
                <span class="stepper-dot"></span>
                <span>ขั้นตอนที่ ${idx + 1}</span>
            `;
            stepperContainer.appendChild(stepItem);

            if (idx < totalSteps - 1) {
                const line = document.createElement('div');
                line.className = `stepper-line ${isChecked ? 'completed' : ''}`;
                stepperContainer.appendChild(line);
            }
        });
    }

    // Dynamic grid classes
    if (viewMode === 'flow') {
        container.className = 'cards-grid single-card';
    } else {
        if (totalSteps === 1) {
            container.className = 'cards-grid single-card';
        } else {
            container.className = 'cards-grid';
        }
    }

    // Build cards
    data.steps.forEach((step, idx) => {
        const key = `${currentCampaign}_${idx}`;
        const isChecked = !!checkedStates[key];
        if (isChecked) completedSteps++;

        // In Flow view, only show the active card
        if (viewMode === 'flow' && idx !== currentFlowStep) {
            return;
        }

        const rawText = step.template(displayChannel, displayBudget);
        const escText = esc(rawText);
        let highlightedHtml = escText;
        
        if (channelName.trim()) {
            highlightedHtml = highlightedHtml.replaceAll(esc(displayChannel), `<span class="hl">${esc(displayChannel)}</span>`);
        }
        if (data.showBudget && budgetValue.trim()) {
            highlightedHtml = highlightedHtml.replaceAll(esc(displayBudget), `<span class="hl-budget">${esc(displayBudget)}</span>`);
        }

        // Link buttons builder
        let linkButtonsHtml = '';
        const urlRegex = /(https?:\/\/[^\s\n\r]+)/g;
        const urls = rawText.match(urlRegex);
        if (urls) {
            linkButtonsHtml = '<div class="card-links">';
            urls.forEach(url => {
                let label = "เปิดลิงก์";
                if (url.includes("canva.com")) {
                    label = "🎨 เปิดไฟล์บรีฟ Canva";
                } else if (url.includes("tiktok.com")) {
                    label = "🎵 เปิดคลิปตัวอย่าง TikTok";
                }
                linkButtonsHtml += `<a href="${url}" target="_blank" class="card-link-btn">${label}</a>`;
            });
            linkButtonsHtml += '</div>';
        }

        const card = document.createElement('div');
        
        let cardClasses = ['script-card'];
        if (isChecked) cardClasses.push('completed');
        
        // Grid span full for first step in multi-step views
        if (viewMode === 'grid' && totalSteps > 1 && idx === 0) {
            cardClasses.push('span-full');
        }
        card.className = cardClasses.join(' ');
        card.id = `card_${idx}`;
        
        let footerContent = '';
        if (viewMode === 'flow') {
            footerContent = `
                <button class="btn-secondary" onclick="prevFlowStep()" ${idx === 0 ? 'disabled' : ''}>ย้อนกลับ</button>
                <button class="btn-copy btn-large" id="copy_btn_${idx}" onclick="copyCardText(${idx}, true)">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="display:inline-block; vertical-align:middle; margin-right: 4px;">
                        <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                        <path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                    คัดลอกข้อความ & ขั้นตอนถัดไป 👉
                </button>
            `;
        } else {
            footerContent = `
                <button class="btn-copy" id="copy_btn_${idx}" onclick="copyCardText(${idx}, false)">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="display:inline-block; vertical-align:middle; margin-right: 4px;">
                        <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                        <path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                    คัดลอกข้อความ
                </button>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title-group">
                    <span class="step-number">${idx + 1}</span>
                    <span class="card-title">${step.label}</span>
                </div>
                <div class="card-actions">
                    <label class="sent-indicator">
                        <input type="checkbox" class="sent-checkbox" id="check_${idx}" onchange="toggleStepStatus(${idx})" ${isChecked ? 'checked' : ''}>
                        <span>ส่งแล้ว</span>
                    </label>
                </div>
            </div>
            <div class="card-body-wrapper">
                <div class="card-body" contenteditable="true" id="body_${idx}">${highlightedHtml}</div>
                ${linkButtonsHtml}
            </div>
            <div class="card-footer">
                ${footerContent}
            </div>
        `;

        container.appendChild(card);
    });

    updateProgress(completedSteps, totalSteps);
}

// Escaping safety helper
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Toggle checkboxes status
function toggleStepStatus(idx) {
    const key = `${currentCampaign}_${idx}`;
    const checkbox = document.getElementById(`check_${idx}`);
    const card = document.getElementById(`card_${idx}`);

    if (checkbox && checkbox.checked) {
        checkedStates[key] = true;
        if (card) card.classList.add('completed');
    } else {
        delete checkedStates[key];
        if (card) card.classList.remove('completed');
    }

    localStorage.setItem('global_checked_states', JSON.stringify(checkedStates));
    
    let totalSteps = templates[currentCampaign].steps.length;
    let completedSteps = 0;
    for(let i=0; i<totalSteps; i++) {
        if (checkedStates[`${currentCampaign}_${i}`]) completedSteps++;
    }
    updateProgress(completedSteps, totalSteps);

    if (viewMode === 'flow') {
        renderActiveCampaign();
    }
}

// Flow views operations
function prevFlowStep() {
    if (currentFlowStep > 0) {
        currentFlowStep--;
        renderActiveCampaign();
    }
}

function nextFlowStep() {
    const totalSteps = templates[currentCampaign].steps.length;
    if (currentFlowStep < totalSteps - 1) {
        currentFlowStep++;
        renderActiveCampaign();
    }
}

// Progress Bar helper
function updateProgress(completed, total) {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    const pb = document.getElementById('progressBar');
    const pt = document.getElementById('progressText');
    if (pb) pb.style.width = `${pct}%`;
    if (pt) pt.innerText = `สถานะ: ส่งไปแล้ว ${completed}/${total} ขั้นตอน`;
}

// Clipboard copying
function copyCardText(idx, advanceStep = false) {
    const bodyEl = document.getElementById(`body_${idx}`);
    if (!bodyEl) return;
    
    const textToCopy = bodyEl.innerText || bodyEl.textContent;

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("คัดลอกขั้นตอนที่ " + (idx + 1) + " เรียบร้อย!");
        
        const checkbox = document.getElementById(`check_${idx}`);
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            toggleStepStatus(idx);
        }

        const btn = document.getElementById(`copy_btn_${idx}`);
        if (btn) {
            const origHtml = btn.innerHTML;
            btn.innerHTML = '✓ คัดลอกเรียบร้อย';
            btn.classList.add('copied');
            
            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = origHtml;
                    btn.classList.remove('copied');
                }
            }, 2000);
        }

        if (advanceStep) {
            const totalSteps = templates[currentCampaign].steps.length;
            if (currentFlowStep < totalSteps - 1) {
                setTimeout(() => {
                    nextFlowStep();
                }, 800);
            }
        }
    });
}

// Toast notification helper
let toastTimer;
function showToast(msg) {
    clearTimeout(toastTimer);
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    if (toastText) toastText.innerText = msg;
    if (toast) toast.classList.add('show');
    toastTimer = setTimeout(() => {
        if (toast) toast.classList.remove('show');
    }, 2500);
}