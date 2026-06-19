// Navigation auto-restore router
(function checkRedirect() {
    const filename = window.location.pathname.split('/').pop().replace('.html', '');
    const pageId = (filename === '' || filename === 'index') ? 'index' : filename;
    
    if (pageId === 'index') {
        const lastCampaign = localStorage.getItem('global_last_campaign');
        const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
        
        if (lastCampaign && lastCampaign !== 'index') {
            if (defaultList.includes(lastCampaign)) {
                window.location.replace(`pages/${lastCampaign}.html`);
            } else {
                // If it's a custom template, redirect to the default sereniz page with the hash
                window.location.replace(`pages/sereniz.html#${lastCampaign}`);
            }
        } else {
            window.location.replace('pages/sereniz.html');
        }
    } else {
        const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
        if (defaultList.includes(pageId) || pageId.startsWith('custom_')) {
            localStorage.setItem('global_last_campaign', pageId);
        }
    }
})();

// ==========================================
// SUPABASE CONFIGURATION (OPTIONAL)
// ==========================================
// Fill in your credentials below to sync custom templates across the team.
// Other user data (Name, Phone, Email) will remain strictly local (not synced).
// NOTE: Use the "anon" (public) key here, NOT the "service_role" key for security.
const SUPABASE_URL = "https://ztgymxksjftjgssrypwi.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Z3lteGtzamZ0amdzc3J5cHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDk2MjYsImV4cCI6MjA5NzQyNTYyNn0.j3gVGNFffH_pOaJXiYFPZVauBIBoouQ7YNspoqniqkE";
// ==========================================

// ==========================================
// GLOBAL STATE DECLARATIONS (Declared early to prevent ReferenceErrors)
// ==========================================
const defaultProfiles = [];
let userProfiles = [];
let activeProfileId = '';
let customTemplates = {};
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch(e) {
        console.error("Supabase load error: check CDN loading.", e);
    }
}
function initCustomTemplates() {
    const saved = localStorage.getItem('global_custom_templates');
    if (saved) {
        try {
            customTemplates = JSON.parse(saved);
        } catch(e) {
            customTemplates = {};
        }
    }
    
    // Explicitly delete and purge diagnostic mock templates from local cache
    let needsPurge = false;
    if (customTemplates['test_id']) {
        delete customTemplates['test_id'];
        needsPurge = true;
    }
    if (customTemplates['test_steps_id']) {
        delete customTemplates['test_steps_id'];
        needsPurge = true;
    }
    if (needsPurge) {
        localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
    }
    
    // Run sanitization on locally loaded templates
    sanitizeCustomTemplatesWithPlaceholders();
    
    if (supabaseClient) {
        loadSupabaseTemplates();
    }
}

function sanitizeCustomTemplatesWithPlaceholders() {
    let changed = false;
    const legacyPhones = ['0641607169'];
    const legacyEmails = ['oak@drivebrand.co.th'];
    
    Object.keys(customTemplates).forEach(key => {
        const tpl = customTemplates[key];
        if (tpl && tpl.steps) {
            tpl.steps.forEach(step => {
                if (step.templateText) {
                    let text = step.templateText;
                    
                    // Replace legacy credentials
                    legacyPhones.forEach(ph => {
                        if (text.includes(ph)) {
                            text = text.replaceAll(ph, '{เบอร์โทร}');
                            changed = true;
                        }
                    });
                    legacyEmails.forEach(em => {
                        if (text.includes(em)) {
                            text = text.replaceAll(em, '{อีเมล}');
                            changed = true;
                        }
                    });
                    
                    // Replace current profiles credentials
                    if (userProfiles && userProfiles.length > 0) {
                        userProfiles.forEach(profile => {
                            if (profile.phone && profile.phone.trim().length > 3 && text.includes(profile.phone)) {
                                text = text.replaceAll(profile.phone, '{เบอร์โทร}');
                                changed = true;
                            }
                            if (profile.email && profile.email.trim().length > 3 && text.includes(profile.email)) {
                                text = text.replaceAll(profile.email, '{อีเมล}');
                                changed = true;
                            }
                            if (profile.name && profile.name.trim().length > 1 && text.includes(profile.name)) {
                                text = text.replaceAll(profile.name, '{ชื่อคนส่ง}');
                                changed = true;
                            }
                        });
                    }
                    
                    if (text !== step.templateText) {
                        step.templateText = text;
                        changed = true;
                    }
                }
            });
        }
    });
    
    if (changed) {
        localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
        if (supabaseClient) {
            Object.keys(customTemplates).forEach(key => {
                saveToSupabase(key, customTemplates[key]);
            });
        }
    }
}

async function loadSupabaseTemplates() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('custom_templates')
            .select('*');
            
        if (error) throw error;
        
        if (data) {
            const remoteKeys = new Set(data.map(item => item.id));
            const localKeys = Object.keys(customTemplates);
            
            // Auto-upload any templates created locally before Supabase integration
            for (const key of localKeys) {
                if (!remoteKeys.has(key)) {
                    await saveToSupabase(key, customTemplates[key]);
                }
            }
            
            data.forEach(item => {
                customTemplates[item.id] = {
                    title: item.title,
                    badge: item.badge,
                    showBudget: item.show_budget,
                    steps: item.steps
                };
            });
            
            // Run sanitization after merging remote updates
            sanitizeCustomTemplatesWithPlaceholders();
            
            localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
            renderSidebarNavigation();
            
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash && customTemplates[currentHash]) {
                currentCampaign = currentHash;
            }
            renderActiveCampaign();
        }
    } catch(e) {
        console.error("Error loading templates from Supabase:", e);
        if (e && typeof e === 'object') {
            console.log("Supabase Error Details:", JSON.stringify(e));
            showToast("Supabase Connect Error: " + (e.message || "Unknown error"));
        }
    }
}

// Run initialization in the correct order
initUserProfiles();
initCustomTemplates();

function initUserProfiles() {
    const savedProfiles = localStorage.getItem('global_user_profiles');
    const savedActiveId = localStorage.getItem('global_active_profile_id');
    
    if (savedProfiles) {
        try {
            userProfiles = JSON.parse(savedProfiles);
            
            // Clean up legacy default profiles if present
            const beforeLen = userProfiles.length;
            userProfiles = userProfiles.filter(p => p.id !== '1' && p.id !== '2' && p.id !== '3');
            
            // Safety sanitization of old test cache data
            let hasPersonalData = false;
            userProfiles.forEach(p => {
                if (p.phone === '0641607169') {
                    p.phone = '08X-XXX-XXXX';
                    hasPersonalData = true;
                }
                if (p.email === 'oak@drivebrand.co.th') {
                    p.email = 'contact@drivebrand.co.th';
                    hasPersonalData = true;
                }
            });
            if (hasPersonalData || userProfiles.length !== beforeLen) {
                localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
            }
        } catch(e) {
            userProfiles = [...defaultProfiles];
        }
    } else {
        userProfiles = [...defaultProfiles];
        localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
    }
    
    if (savedActiveId && userProfiles.some(p => p.id === savedActiveId)) {
        activeProfileId = savedActiveId;
    } else if (userProfiles.length > 0) {
        activeProfileId = userProfiles[0].id;
        localStorage.setItem('global_active_profile_id', activeProfileId);
    } else {
        activeProfileId = '';
        localStorage.setItem('global_active_profile_id', '');
    }
}

// (initUserProfiles is called above before custom templates)

function getCurrentUser() {
    const user = userProfiles.find(p => p.id === activeProfileId);
    if (user) {
        return {
            name: user.name,
            phone: (user.phone && user.phone.trim()) ? user.phone.trim() : '08X-XXX-XXXX',
            email: (user.email && user.email.trim()) ? user.email.trim() : 'contact@drivebrand.co.th'
        };
    }
    return { name: '(ใส่ชื่อเล่น)', phone: '08X-XXX-XXXX', email: 'contact@drivebrand.co.th' };
}

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
                template: (ch) => `สวัสดีครับ ขออนุญาตแนะนำตัวนะครับ ${getCurrentUser().name} จากบริษัทไดร์ฟจำกัด\n\n${getCurrentUser().name} ติดตามมาจากช่อง (${ch}) ทาง Tiktok ครับ\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า เห็นทางช่องน่าสนใจทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% 📌(สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\n📸 รีวิว สไตล์คุณ ได้เลยเต็มที่\n\n❌(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nทางเราตามหา Influencer ที่สื่อมีความเกี่ยวข้องกับสินค้าของเราครับ\n\nคลิปตัวอย่างของอินฟูที่รีวิวสินค้าของทางเราครับ😊❤️\n\nhttps://vt.tiktok.com/ZSmLS9141/\nhttps://vt.tiktok.com/ZSmX2r8aa/\nhttps://vt.tiktok.com/ZSmX2SB3F/\n\n📌สินค้าของเราจะเป็นอาหารเสริมสนับสนุนการนอน Sereniz 💤 🛌นะครับ Link Tiktok โปรไฟล์ร้านของเราบน tiktok ชื่อ driveonline\n\nhttps://www.tiktok.com/@drive.officialth?_r=1&_t=ZS-96GW3KfWI8D\n\nสามารถเข้าดูสินค้าได้ที่หน้าโปรไฟล์เราก่อนตัดสินใจนะครับ หากสนใจหรือมีข้อมูลสอบถามเพิ่มเติมแจ้งกลับ ${getCurrentUser().name} ได้เลยนะครับ 🥰🙇🏻`
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
                template: (ch) => `สวัสดีครับ 🙇🏻 ${getCurrentUser().name} จากบริษัทไดร์ฟครับ\n\nพอดีติดตามคอนเทนต์ของคุณใน TikTok จากช่อง (${ch}) แล้วรู้สึกว่าสไตล์ช่องน่าสนใจมากครับ 😊\n\n ตอนนี้ทางเรากำลังหา Creator ร่วมรีวิวสินค้าของแบรนด์ เลยอยากขออนุญาตสอบถามว่าพอสนใจรับงานแนว Affiliate / Commission ไหมครับ\n\nทางเราจะส่งสินค้าให้ทดลองใช้ฟรีครับ\n\nและมีค่าคอมจากยอดขายผ่าน TikTok Shop ให้ครับ ✨\n\nรีวิวในสไตล์ของตัวเองได้เต็มที่เลยครับ\n\nผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง (Instagram) แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻\n\nหากสนใจ เดี๋ยว${getCurrentUser().name}ส่งรายละเอียดเพิ่มเติมให้ได้เลยครับ 🙏🏻`
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
                template: (ch) => `เรียน คุณ (${ch})\n\nสวัสดีครับ ผม (${getCurrentUser().name}) ติดต่อจาก แบรนด์ Drive บริษัทไดร์ฟจำกัดนะครับ\n\nพอดีผมมีโอกาสได้ติดตามผลงานของคุณ (${ch}) ผ่านทาง (TikTok) แล้วรู้สึกสนใจในการทำคลิปมากๆ เลยครับ เลยตั้งใจอีเมลมาทักทายและขออนุญาตขอช่องทางติดต่อ Connection เพื่อพูดคุยเกี่ยวกับงาน\n\nพอดีทางเราต้องการหาพันธมิตร tiktok ในการกระจายสินค้า ทางเราจึงมีข้อเสนอเป็นส่วนแบ่งยอดขาย 10% (สำหรับสินค้าที่ปักตะกร้า) ทางเราจะจัดส่งสินค้าไปให้ใช้ก่อน(ฟรี)\n\nรีวิว สไตล์คุณ ได้เลยเต็มที่\n(งานนี้ไม่ มีBudget นะครับแต่จะเป็นส่วนแบ่งยอดขายผ่านระบบ tiktok shop ครับหรือคอมมิชชั่นจากยอดขาย )\n\nยินดีที่ได้รู้จักอย่างเป็นทางการผ่านทาง Gmail นะครับ หากคุณ (${ch}) สามารถทักมาพูดคุยกันได้ตลอดเลยครับ ยินดีมากๆ ครับ\n\nขอให้เป็นสัปดาห์ที่ดีและราบรื่นนะครับ\n\nขอแสดงความนับถือ\n(${getCurrentUser().name})\n(ช่องทางติดต่อ Line / โทร : ${getCurrentUser().phone} | อีเมล : ${getCurrentUser().email})`
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
                template: () => `สวัสดีครับผม ${getCurrentUser().name} จากบริษัทไดรฟ์จำกัดครับ มาติดงานรีวิวสินค้าตัวใหม่ของทางแบรนด์ ชื่อ Sereniz(เซเรไนท์) เป็นแม็กนีเซียมปรับสมดุลการนอนครับ ผมขอช่องทางคุยงานหน่อยครับหรือสะดวกทาง Instagram แจ้งได้เลยนะครับขอบคุณมากๆครับ🙏🏻🙇🏻 (พอดีค้นหาไลน์ไม่เจอครับ)`
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
                template: (ch, budget) => `สวัสดีครับ ${getCurrentUser().name}นะครับ ติดต่อจาก แบรนด์ Drive บริษัท ไดร์ฟ จำกัด ครับ 🙏\n\nได้เห็นผลงานผ่านช่อง TikTok จากช่อง (${ch}) ทางแบรนด์จึงมีความสนใจ Asset คลิป Influencer หรือซื้อคลิป โดยการจัดทำคลิปวิดีโอรีวิวสินค้า เพื่อนำไปเผยแพร่บนช่องทางของแบรนด์โดยตรง\n(ไม่ต้องโพสต์ลงช่องทางส่วนตัวของคุณนะครับ)\n\nสินค้า: Sereniz ผลิตภัณฑ์เสริมอาหาร\n🔗 https://vt.tiktok.com/ZS9eUvXJDCM39-gqR5D/\n\n✨ รายละเอียดงาน (SOW)\n* จัดทำคลิปวิดีโอรีวิวสินค้า 1 คลิป โดยไม่ต้องใส่ Text\n* ความยาวประมาณ 1 นาที (ไม่ต่ำกว่า 45 วินาที) มีการพากย์เสียง\n* ใช้สำหรับลงทุกช่องทางของแบรนด์\n* ถ่ายทำตามบรีฟของทางแบรนด์ (สามารถปรับสไตล์ให้เหมาะกับตัวคุณได้ค่ะ)\n* ส่ง Draft แรกภายใน 3–5 วัน หลังจากได้รับสินค้า\n* ทางแบรนด์ขอสิทธิ์แก้ไขงานได้ไม่เกิน 3 ครั้ง\n\n💰Budget : ${budget} บาท\n\nหากสนใจ สามารถแจ้งเรท / สอบถามรายละเอียดเพิ่มเติมได้เลยนะครับ\nขอบคุณมากครับ 🙏✨`
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
    const hash = window.location.hash.replace('#', '');
    if (hash && (templates[hash] || customTemplates[hash])) {
        return hash;
    }
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
    // Determine campaign from filename or hash
    currentCampaign = getPageId();

    // Load user profiles and inject user interface
    initUserProfiles();
    injectUserInterface();
    
    // Render dynamic sidebar navigation
    renderSidebarNavigation();

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
    const data = customTemplates[currentCampaign] || templates[currentCampaign];
    if (data) {
        toggleBudgetField(data.showBudget);
    }

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
    const data = customTemplates[currentCampaign] || templates[currentCampaign];
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

        let rawText = '';
        if (typeof step.template === 'function') {
            rawText = step.template(displayChannel, displayBudget);
        } else {
            let t = step.templateText || '';
            t = t.replaceAll('{ชื่อคนส่ง}', getCurrentUser().name);
            t = t.replaceAll('{name}', getCurrentUser().name);
            t = t.replaceAll('{เบอร์โทร}', getCurrentUser().phone);
            t = t.replaceAll('{phone}', getCurrentUser().phone);
            t = t.replaceAll('{อีเมล}', getCurrentUser().email);
            t = t.replaceAll('{email}', getCurrentUser().email);
            t = t.replaceAll('{ชื่อช่อง}', displayChannel);
            t = t.replaceAll('{channel}', displayChannel);
            t = t.replaceAll('{งบประมาณ}', displayBudget);
            t = t.replaceAll('{budget}', displayBudget);
            rawText = t;
        }
        const escText = esc(rawText);
        let highlightedHtml = escText;
        
        // Always highlight the channel name (either typed or fallback '(ชื่อช่อง)')
        highlightedHtml = highlightedHtml.replaceAll(esc(displayChannel), `<span class="hl">${esc(displayChannel)}</span>`);
        if (data.showBudget && budgetValue.trim()) {
            highlightedHtml = highlightedHtml.replaceAll(esc(displayBudget), `<span class="hl-budget">${esc(displayBudget)}</span>`);
        }
        
        // Highlight Sender details dynamically
        const currentUser = getCurrentUser();
        if (currentUser.name) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.name), `<span class="hl-user">${esc(currentUser.name)}</span>`);
        }
        if (currentUser.phone) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.phone), `<span class="hl-user">${esc(currentUser.phone)}</span>`);
        }
        if (currentUser.email) {
            highlightedHtml = highlightedHtml.replaceAll(esc(currentUser.email), `<span class="hl-user">${esc(currentUser.email)}</span>`);
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
    
    const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
    let totalSteps = activeData ? activeData.steps.length : 0;
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
    const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
    const totalSteps = activeData ? activeData.steps.length : 0;
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
            const activeData = customTemplates[currentCampaign] || templates[currentCampaign];
            const totalSteps = activeData ? activeData.steps.length : 0;
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

// --- USER PROFILES SYSTEM LOGIC ---

// Dynamic Injection of Sender Controls and Modal
function injectUserInterface() {
    // 1. Inject Sender Profile Button in the Sidebar
    const sidebarScroll = document.querySelector('.sidebar-scroll');
    if (sidebarScroll) {
        // Check if already injected to prevent duplication
        if (!document.getElementById('sidebarUserControlGroup')) {
            const userControlGroup = document.createElement('div');
            userControlGroup.className = 'control-group';
            userControlGroup.id = 'sidebarUserControlGroup';
            userControlGroup.innerHTML = `
                <button class="btn-secondary" onclick="openUserManageModal()" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 12.5px; padding: 12px 14px; border-radius: 10px; margin-bottom: 8px;">
                    <span>⚙️ จัดการโปรไฟล์ผู้ส่ง</span>
                </button>
            `;
            // Insert at the top of sidebar scroll area
            sidebarScroll.insertBefore(userControlGroup, sidebarScroll.firstChild);
        }
    }

    // 2. Inject Modal HTML into the body if it doesn't exist
    if (!document.getElementById('userManageModal')) {
        const modalHtml = `
        <div id="userManageModal" class="modal-backdrop" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ จัดการโปรไฟล์ผู้ใช้</h3>
                    <button class="modal-close" onclick="closeUserManageModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Form to add/edit profile -->
                    <div class="profile-form">
                        <h4 id="formTitle">เพิ่มโปรไฟล์ใหม่</h4>
                        <input type="hidden" id="editProfileId" value="">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="profileName">ชื่อเล่นผู้ส่ง (ใส่ชื่อเล่น)</label>
                                <input type="text" id="profileName" class="input-field" placeholder="ระบุชื่อเล่น">
                            </div>
                            <div class="form-group">
                                <label for="profilePhone">เบอร์โทร / Line ID</label>
                                <input type="text" id="profilePhone" class="input-field" placeholder="เช่น 08X-XXX-XXXX">
                            </div>
                            <div class="form-group">
                                <label for="profileEmail">อีเมลสำหรับผู้ใช้</label>
                                <input type="text" id="profileEmail" class="input-field" placeholder="เช่น contact@drivebrand.co.th">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button class="btn-secondary" id="btnCancelEdit" onclick="cancelProfileEdit()" style="display:none;">ยกเลิกแก้ไข</button>
                            <button class="btn-copy" onclick="saveProfile()">บันทึกโปรไฟล์</button>
                        </div>
                    </div>

                    <!-- List of existing profiles -->
                    <div class="profile-list-container">
                        <h4>รายการโปรไฟล์ทั้งหมด (คลิกเพื่อเลือกใช้งาน)</h4>
                        <div class="profile-list" id="modalProfileList">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 3. Inject Custom Template Modal HTML into the body if it doesn't exist
    if (!document.getElementById('customTemplateModal')) {
        const customTemplateModalHtml = `
        <div id="customTemplateModal" class="modal-backdrop" style="display: none;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 id="tplModalTitle">➕ เพิ่มรูปแบบเทมเพลตใหม่</h3>
                    <button class="modal-close" onclick="closeCustomTemplateModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="profile-form" style="margin-bottom: 0;">
                        <input type="hidden" id="editTplKey" value="">
                        <div class="form-group" style="margin-bottom: 12px;">
                            <label>ชื่อรูปแบบเทมเพลต</label>
                            <input type="text" id="tplTitle" class="input-field" placeholder="เช่น แคมเปญ Sereniz 20% หรือ ดีลซื้อลิขสิทธิ์">
                        </div>
                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div class="form-group">
                                <label>ป้ายแท็กกำกับ (Badge)</label>
                                <input type="text" id="tplBadge" class="input-field" placeholder="เช่น TikTok DM หรือ Line">
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; padding-top: 24px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                                    <input type="checkbox" id="tplShowBudget" style="width: 16px; height: 16px;">
                                    <span>แสดงช่องระบุงบประมาณในแถบข้าง</span>
                                </label>
                            </div>
                        </div>

                        <div class="step-builder-section" style="border-top: 1px dashed var(--border); padding-top: 16px; margin-top: 16px;">
                            <h4 style="margin-bottom: 12px; font-size: 14px; color: var(--text);">ขั้นตอนและข้อความสคริปต์</h4>
                            <div id="modalStepContainer">
                                <!-- Step input groups will be added here -->
                            </div>
                            
                            <div style="display: flex; gap: 8px; margin-top: 12px;">
                                <button type="button" class="btn-secondary" onclick="addModalStepInput()" style="font-size: 12px; padding: 8px 12px; border-radius: 8px;">➕ เพิ่มขั้นตอน</button>
                                <button type="button" class="btn-secondary" id="btnRemoveModalStep" onclick="removeModalStepInput()" style="font-size: 12px; padding: 8px 12px; border-radius: 8px; display: none;">🗑️ ลบขั้นตอนล่าสุด</button>
                            </div>
                        </div>

                        <!-- Helper guide for placeholders -->
                        <div style="background-color: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
                            <strong>💡 คำค้นแสดงผลอัตโนมัติ (สามารถนำไปใส่ในสคริปต์ได้):</strong><br>
                            • <code>{ชื่อคนส่ง}</code> / <code>{name}</code> : จะแทนด้วยชื่อเล่นผู้ส่งที่เลือกไว้<br>
                            • <code>{เบอร์โทร}</code> / <code>{phone}</code> : จะแทนด้วยเบอร์โทร/Line ID<br>
                            • <code>{อีเมล}</code> / <code>{email}</code> : จะแทนด้วยอีเมลผู้ใช้<br>
                            • <code>{ชื่อช่อง}</code> / <code>{channel}</code> : จะแทนด้วยชื่อช่องที่ป้อนในแถบข้าง<br>
                            • <code>{งบประมาณ}</code> / <code>{budget}</code> : จะแทนด้วยงบประมาณที่ป้อนในแถบข้าง
                        </div>

                        <div class="form-actions" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                            <button class="btn-secondary" onclick="closeCustomTemplateModal()">ยกเลิก</button>
                            <button class="btn-copy" onclick="saveCustomTemplate()">บันทึกรูปแบบเทมเพลต</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', customTemplateModalHtml);
    }
}

// Select active sender profile from the modal list
function selectActiveProfile(id) {
    activeProfileId = id;
    localStorage.setItem('global_active_profile_id', activeProfileId);
    renderModalProfileList();
    renderActiveCampaign();
    showToast(`เปลี่ยนผู้ส่งเป็น "${getCurrentUser().name}" เรียบร้อย`);
}

// Modal open/close actions
function openUserManageModal() {
    const modal = document.getElementById('userManageModal');
    if (modal) {
        modal.style.display = 'flex';
        renderModalProfileList();
        cancelProfileEdit(); // Reset state
    }
}

// Close modal if user clicks outside of modal content
window.addEventListener('click', (event) => {
    const modal = document.getElementById('userManageModal');
    if (event.target === modal) {
        closeUserManageModal();
    }
});

function closeUserManageModal() {
    const modal = document.getElementById('userManageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Render the list of user profiles in the management modal
function renderModalProfileList() {
    const listEl = document.getElementById('modalProfileList');
    if (!listEl) return;

    listEl.innerHTML = '';
    userProfiles.forEach(profile => {
        const isActive = profile.id === activeProfileId;
        const item = document.createElement('div');
        item.className = `profile-item ${isActive ? 'active-profile' : ''}`;
        
        const displayPhone = (profile.phone && profile.phone.trim()) ? profile.phone : '08X-XXX-XXXX';
        const displayEmail = (profile.email && profile.email.trim()) ? profile.email : 'contact@drivebrand.co.th';
        
        item.innerHTML = `
            <div class="profile-item-info" style="cursor: pointer; flex: 1;" onclick="selectActiveProfile('${profile.id}')">
                <div class="profile-item-name">
                    <span>${esc(profile.name)}</span>
                    ${isActive ? '<span class="profile-active-tag">ใช้งานอยู่</span>' : ''}
                </div>
                <div class="profile-item-details">
                    📞 ${esc(displayPhone)} | 📧 ${esc(displayEmail)}
                </div>
            </div>
            <div class="profile-item-actions">
                <button class="btn-icon" title="แก้ไข" onclick="editProfile('${profile.id}')">✏️</button>
                <button class="btn-icon btn-delete" title="ลบ" onclick="deleteProfile('${profile.id}')">🗑️</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// Save profile (Create or Update)
function saveProfile() {
    const nameEl = document.getElementById('profileName');
    const phoneEl = document.getElementById('profilePhone');
    const emailEl = document.getElementById('profileEmail');
    const editIdEl = document.getElementById('editProfileId');

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const email = emailEl.value.trim();
    const editId = editIdEl.value;

    if (!name) {
        alert('กรุณากรอกชื่อเล่น');
        return;
    }

    if (editId) {
        // Update existing profile
        const idx = userProfiles.findIndex(p => p.id === editId);
        if (idx !== -1) {
            userProfiles[idx].name = name;
            userProfiles[idx].phone = phone;
            userProfiles[idx].email = email;
            showToast('อัปเดตโปรไฟล์เรียบร้อย');
        }
    } else {
        // Add new profile
        const newProfile = {
            id: Date.now().toString(),
            name: name,
            phone: phone,
            email: email
        };
        userProfiles.push(newProfile);
        
        // Auto-select the newly added profile as active
        activeProfileId = newProfile.id;
        localStorage.setItem('global_active_profile_id', activeProfileId);
        showToast('เพิ่มโปรไฟล์และเลือกใช้งานสำเร็จ');
    }

    // Save to localStorage
    localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
    
    // Clear and update
    nameEl.value = '';
    phoneEl.value = '';
    emailEl.value = '';
    editIdEl.value = '';
    
    cancelProfileEdit();
    renderModalProfileList();
    renderActiveCampaign();
    closeUserManageModal();
}

// Set up form for editing
function editProfile(id) {
    const profile = userProfiles.find(p => p.id === id);
    if (!profile) return;

    document.getElementById('profileName').value = profile.name;
    document.getElementById('profilePhone').value = profile.phone;
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('editProfileId').value = profile.id;

    document.getElementById('formTitle').textContent = `แก้ไขโปรไฟล์: ${profile.name}`;
    document.getElementById('btnCancelEdit').style.display = 'inline-block';
}

// Cancel edit mode
function cancelProfileEdit() {
    document.getElementById('profileName').value = '';
    document.getElementById('profilePhone').value = '';
    document.getElementById('profileEmail').value = '';
    document.getElementById('editProfileId').value = '';

    document.getElementById('formTitle').textContent = 'เพิ่มโปรไฟล์ใหม่';
    document.getElementById('btnCancelEdit').style.display = 'none';
}

// Delete profile
function deleteProfile(id) {
    const profileToDelete = userProfiles.find(p => p.id === id);
    if (!profileToDelete) return;

    if (userProfiles.length <= 1) {
        alert('ไม่สามารถลบโปรไฟล์ได้ เนื่องจากต้องมีอย่างน้อย 1 โปรไฟล์ในระบบ');
        return;
    }

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบโปรไฟล์ "${profileToDelete.name}"?`)) {
        userProfiles = userProfiles.filter(p => p.id !== id);
        
        // If the deleted profile was active, set active to another one
        if (id === activeProfileId) {
            activeProfileId = userProfiles[0].id;
            localStorage.setItem('global_active_profile_id', activeProfileId);
        }

        localStorage.setItem('global_user_profiles', JSON.stringify(userProfiles));
        
        showToast(`ลบโปรไฟล์ "${profileToDelete.name}" สำเร็จ`);
        renderModalProfileList();
        renderActiveCampaign();
    }
}

// --- CUSTOM TEMPLATE SYSTEM LOGIC ---

let modalStepCount = 0;

function openCustomTemplateModal(editKey = '') {
    const modal = document.getElementById('customTemplateModal');
    if (modal) {
        modal.style.display = 'flex';
        const titleEl = document.getElementById('tplModalTitle');
        const keyEl = document.getElementById('editTplKey');
        const container = document.getElementById('modalStepContainer');
        
        container.innerHTML = '';
        modalStepCount = 0;
        
        const hasTpl = editKey && (customTemplates[editKey] || templates[editKey]);
        if (hasTpl) {
            const temp = customTemplates[editKey] || templates[editKey];
            if (titleEl) titleEl.textContent = '✏️ แก้ไขรูปแบบเทมเพลต';
            if (keyEl) keyEl.value = editKey;
            
            document.getElementById('tplTitle').value = temp.title;
            document.getElementById('tplBadge').value = temp.badge || 'Custom';
            document.getElementById('tplShowBudget').checked = temp.showBudget || false;
            
            temp.steps.forEach(step => {
                addModalStepInput();
                // Fill details for each step
                const labelInput = document.querySelector(`#modalStepGroup_${modalStepCount} .modal-step-label`);
                const textInput = document.querySelector(`#modalStepGroup_${modalStepCount} .modal-step-text`);
                if (labelInput) labelInput.value = step.label;
                
                let text = '';
                if (typeof step.template === 'function') {
                    try {
                        text = step.template('{ชื่อช่อง}', '{งบประมาณ}');
                        // Reverse-replace current user details back to placeholders
                        const currentUser = getCurrentUser();
                        if (currentUser.name) text = text.replaceAll(currentUser.name, '{ชื่อคนส่ง}');
                        if (currentUser.phone) text = text.replaceAll(currentUser.phone, '{เบอร์โทร}');
                        if (currentUser.email) text = text.replaceAll(currentUser.email, '{อีเมล}');
                    } catch(e) {
                        text = '';
                    }
                } else {
                    text = step.templateText || '';
                }
                if (textInput) textInput.value = text;
            });
        } else {
            if (titleEl) titleEl.textContent = '➕ เพิ่มรูปแบบเทมเพลตใหม่';
            if (keyEl) keyEl.value = '';
            
            document.getElementById('tplTitle').value = '';
            document.getElementById('tplBadge').value = '';
            document.getElementById('tplShowBudget').checked = false;
            
            // Add first step by default
            addModalStepInput();
        }
    }
}

function closeCustomTemplateModal() {
    const modal = document.getElementById('customTemplateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function addModalStepInput() {
    modalStepCount++;
    const container = document.getElementById('modalStepContainer');
    
    const stepDiv = document.createElement('div');
    stepDiv.className = 'modal-step-input-group';
    stepDiv.id = `modalStepGroup_${modalStepCount}`;
    stepDiv.style.border = '1px solid var(--border)';
    stepDiv.style.borderRadius = '8px';
    stepDiv.style.padding = '12px';
    stepDiv.style.marginBottom = '10px';
    stepDiv.style.backgroundColor = 'var(--surface3)';
    
    stepDiv.innerHTML = `
        <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: 600; font-size: 12.5px;">ชื่อขั้นตอนที่ ${modalStepCount}</label>
            <input type="text" class="input-field modal-step-label" placeholder="เช่น สคริปต์เริ่มต้น หรือ ทักทายแรก" style="padding: 8px 10px; font-size: 13px;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <label style="font-weight: 600; font-size: 12.5px;">เนื้อหาสคริปต์</label>
            <textarea class="input-field modal-step-text" placeholder="พิมพ์ข้อความสคริปต์ที่นี่... (ใส่ {ชื่อช่อง} หรือ {ชื่อคนส่ง} ได้)" style="min-height: 100px; padding: 10px; font-size: 13px; resize: vertical; line-height: 1.5; font-family: inherit;"></textarea>
        </div>
    `;
    container.appendChild(stepDiv);
    
    // Toggle remove button visibility
    const removeBtn = document.getElementById('btnRemoveModalStep');
    if (removeBtn) {
        removeBtn.style.display = modalStepCount > 1 ? 'inline-block' : 'none';
    }
}

function removeModalStepInput() {
    if (modalStepCount > 1) {
        const stepDiv = document.getElementById(`modalStepGroup_${modalStepCount}`);
        if (stepDiv) stepDiv.remove();
        modalStepCount--;
    }
    
    // Toggle remove button visibility
    const removeBtn = document.getElementById('btnRemoveModalStep');
    if (removeBtn) {
        removeBtn.style.display = modalStepCount > 1 ? 'inline-block' : 'none';
    }
}

function editCustomTemplate(key) {
    openCustomTemplateModal(key);
}

function saveCustomTemplate() {
    const title = document.getElementById('tplTitle').value.trim();
    const badge = document.getElementById('tplBadge').value.trim() || 'Custom';
    const showBudget = document.getElementById('tplShowBudget').checked;
    const editKey = document.getElementById('editTplKey').value;
    
    if (!title) {
        alert('กรุณากรอกชื่อรูปแบบเทมเพลต');
        return;
    }
    
    // Gather steps
    const stepGroups = document.querySelectorAll('.modal-step-input-group');
    const steps = [];
    let hasEmpty = false;
    
    stepGroups.forEach((group, idx) => {
        const label = group.querySelector('.modal-step-label').value.trim() || `ขั้นตอนที่ ${idx + 1}`;
        const templateText = group.querySelector('.modal-step-text').value;
        
        if (!templateText.trim()) {
            hasEmpty = true;
        }
        
        steps.push({
            label: label,
            filename: `step-${idx + 1}.txt`,
            templateText: templateText
        });
    });
    
    if (hasEmpty) {
        alert('กรุณากรอกเนื้อหาสคริปต์ของทุกขั้นตอน');
        return;
    }
    
    let key = editKey;
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    
    if (key && (customTemplates[key] || isDefault)) {
        // Edit existing template or override default template
        customTemplates[key] = {
            title: title,
            badge: badge,
            showBudget: showBudget,
            steps: steps
        };
        showToast(isDefault ? `แก้ไขและบันทึกค่าเทมเพลตเริ่มต้น "${title}" แล้ว` : `แก้ไขเทมเพลต "${title}" สำเร็จ!`);
    } else {
        // Create new template
        key = 'custom_' + Date.now();
        customTemplates[key] = {
            title: title,
            badge: badge,
            showBudget: showBudget,
            steps: steps
        };
        showToast(`เพิ่มเทมเพลต "${title}" สำเร็จ!`);
    }
    
    // Save to localStorage
    localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
    
    // Save to Supabase if configured
    if (supabaseClient) {
        saveToSupabase(key, customTemplates[key]);
    }
    
    // Re-render sidebar and close modal
    renderSidebarNavigation();
    closeCustomTemplateModal();
    
    // Automatically select the template
    selectCustomCampaign(key);
}

async function saveToSupabase(key, templateData) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('custom_templates')
            .upsert({
                id: key,
                title: templateData.title,
                badge: templateData.badge,
                show_budget: templateData.showBudget,
                steps: templateData.steps
            });
            
        if (error) throw error;
    } catch(e) {
        console.error("Error saving template to Supabase:", e);
        if (e && typeof e === 'object') {
            console.log("Supabase Save Error Details:", JSON.stringify(e));
            showToast("Supabase Save Error: " + (e.message || JSON.stringify(e)));
        } else {
            showToast("ไม่สามารถอัพเดทสคริปต์ออนไลน์ได้ (แต่บันทึกลงในเครื่องนี้แล้ว)");
        }
    }
}

function deleteCustomTemplate(key) {
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    
    const confirmMsg = isDefault 
        ? `คุณต้องการคืนค่าเริ่มต้นสำหรับเทมเพลต "${templates[key].title}" หรือไม่? ข้อมูลที่แก้ไขจะหายไป`
        : `คุณแน่ใจหรือไม่ที่จะลบรูปแบบเทมเพลต "${customTemplates[key].title}"?`;
        
    if (confirm(confirmMsg)) {
        const title = customTemplates[key] ? customTemplates[key].title : (templates[key] ? templates[key].title : '');
        delete customTemplates[key];
        localStorage.setItem('global_custom_templates', JSON.stringify(customTemplates));
        
        // Delete from Supabase if configured
        if (supabaseClient) {
            deleteFromSupabase(key);
        }
        
        showToast(isDefault ? `คืนค่าเทมเพลต "${title}" สำเร็จ` : `ลบเทมเพลต "${title}" สำเร็จ`);
        
        renderSidebarNavigation();
        renderActiveCampaign();
    }
}

async function deleteFromSupabase(key) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient
            .from('custom_templates')
            .delete()
            .eq('id', key);
            
        if (error) throw error;
    } catch(e) {
        console.error("Error deleting template from Supabase:", e);
    }
}

function selectCustomCampaign(key) {
    currentCampaign = key;
    
    const defaultList = ['sereniz', 'contact', 'gmail', 'tiktok', 'buyasset'];
    const isDefault = defaultList.includes(key);
    
    if (isDefault) {
        const isRootPage = window.location.pathname.split('/').pop().replace('.html', '') === 'index' || window.location.pathname.endsWith('/');
        const pathPrefix = isRootPage ? 'pages/' : '';
        const currentPageName = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (currentPageName !== key) {
            window.location.replace(`${pathPrefix}${key}.html`);
            return;
        }
    } else {
        window.location.hash = key;
    }
    
    localStorage.setItem('global_last_campaign', key);
    
    // Render the dynamic navigation bar to show active highlight
    renderSidebarNavigation();
    
    // Toggle budget input visibility based on campaign requirements
    const data = customTemplates[key] || templates[key];
    if (data) {
        toggleBudgetField(data.showBudget);
    }
    
    // Reset flow step to 0 when switching
    currentFlowStep = 0;
    
    renderActiveCampaign();
}

function renderSidebarNavigation() {
    const navList = document.querySelector('.nav-list');
    if (!navList) return;

    const isRootPage = window.location.pathname.split('/').pop().replace('.html', '') === 'index' || window.location.pathname.endsWith('/');
    const pathPrefix = isRootPage ? 'pages/' : '';

    let html = '';

    const defaultList = [
        { id: 'sereniz', label: 'Sereniz (10%)', icon: '💤' },
        { id: 'contact', label: 'Contact (Affiliate)', icon: '📞' },
        { id: 'gmail', label: 'Gmail Outreach', icon: '📧' },
        { id: 'tiktok', label: 'TikTok Quick DM', icon: '💬' },
        { id: 'buyasset', label: 'Buy Asset (ซื้อคลิป)', icon: '🪙' }
    ];

    defaultList.forEach(item => {
        const isActive = currentCampaign === item.id;
        const hasCustomOverride = !!customTemplates[item.id];
        
        html += `
            <div class="nav-btn-container ${isActive ? 'active' : ''}">
                <a href="${isActive ? '#' : `${pathPrefix}${item.id}.html`}" class="nav-btn" id="nav-${item.id}" onclick="${isActive ? 'event.preventDefault();' : ''}">
                    <span class="nav-btn-icon">${item.icon}</span>
                    <span class="nav-btn-label">${item.label}</span>
                </a>
                <button class="nav-action-btn" onclick="editCustomTemplate('${item.id}')" title="แก้ไขเทมเพลต">
                    ✏️
                </button>
                ${hasCustomOverride ? `
                <button class="nav-action-btn btn-reset" onclick="deleteCustomTemplate('${item.id}')" title="คืนค่าเริ่มต้น">
                    🔄
                </button>
                ` : `
                <div class="nav-action-placeholder"></div>
                `}
            </div>
        `;
    });

    const customKeys = Object.keys(customTemplates);
    if (customKeys.length > 0) {
        html += `<div class="sidebar-divider">เทมเพลตที่เพิ่มเอง</div>`;
        
        customKeys.forEach(key => {
            const temp = customTemplates[key];
            const isActive = currentCampaign === key;
            html += `
                <div class="nav-btn-container ${isActive ? 'active' : ''}">
                    <a href="#${key}" class="nav-btn" id="nav-${key}" onclick="selectCustomCampaign('${key}')">
                        <span class="nav-btn-icon">📄</span>
                        <span class="nav-btn-label">${esc(temp.title)}</span>
                    </a>
                    <button class="nav-action-btn" onclick="editCustomTemplate('${key}')" title="แก้ไขเทมเพลต">
                        ✏️
                    </button>
                    <button class="nav-action-btn btn-delete" onclick="deleteCustomTemplate('${key}')" title="ลบเทมเพลต">
                        🗑️
                    </button>
                </div>
            `;
        });
    }

    html += `
        <button class="btn-secondary btn-add-template" onclick="openCustomTemplateModal()">
            <span>➕ เพิ่มรูปแบบเทมเพลต</span>
        </button>
    `;

    navList.innerHTML = html;
}

// Listen to URL hash change
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && customTemplates[hash]) {
        selectCustomCampaign(hash);
    }
});