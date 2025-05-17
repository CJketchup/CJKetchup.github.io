let countyMapping = {};
        let addressMapping = {};
        let streetMapping = {};

        window.onload = () => {
            Promise.all([
                fetch('County_address_mapping_with_zip.json').then(r => r.json()),
                fetch('address_mapping.json').then(r => r.json()),
                fetch('street_mapping.json').then(r => r.json())
            ]).then(([county, address, street]) => {
                countyMapping = county;
                addressMapping = address;
                streetMapping = street;
                console.log('JSON 讀取完成');

                /* ✅ JSON 完成後再綁事件 */
                document.getElementById('englishAddress')
                    .addEventListener('input', convertAddressToChinese);
            });
        };

        function normalizeEn(str) {
            return str
                .replace(/Taiwan\s*\(R\.O\.C\.\)/i, "")
                .replace(/,\s*\d{3,5}$/, "")        // 只砍尾端郵遞區號
                .replace(/\.\s*/g, ".")             // 移掉 Rd. 後面的空格
                .replace(/\s*,\s*/g, ",")           // 逗號左右去空白
                .replace(/\s+/g, " ")               // 多空白壓一格
                .trim();
        }

        function convertAddressToChinese() {
            let raw = document.getElementById("englishAddress").value;
            if (!raw.trim()) return document.getElementById("chineseAddress").value = "";

            let input = normalizeEn(raw);

            /* ---------- 1. 縣市區 ---------- */
            let countyZh = "";
            const stripTail = s => s
                .replace(/\b(City|County)\b/gi, "")   // 去掉 City / County
                .replace(/\b(District|Dist\.?|Township|Twp\.?)\b/gi, "") // 也可加上 Dist. / Township
                .replace(/\s+/g, " ")                 // 再壓空白
                .trim();

            const inputNoTail = stripTail(input);

            for (const zh of Object.keys(countyMapping)) {
                const en = stripTail(normalizeEn(countyMapping[zh].en));
                if (inputNoTail.toLowerCase().includes(en.toLowerCase())) {
                    countyZh = zh;
                    // ⚠️ 要從「原始 input」刪掉完整那段才不影響後續
                    const fullEn = normalizeEn(countyMapping[zh].en);
                    input = input.replace(new RegExp(fullEn.replace(/\./g, "\\."), "i"), "");
                    break;
                }
            }

            /* ---------- 2. 路名（長字串優先） ---------- */
            let streetZh = "";
            const streets = Object.entries(streetMapping)
                .map(([zh, en]) => [zh, normalizeEn(en)])
                .sort((a, b) => b[1].length - a[1].length);      // 長的先

            for (const [zh, en] of streets) {
                const pattern = new RegExp(`\\b${en.replace(/\./g, "\\.")}\\b`, "i");
                if (pattern.test(input)) {
                    streetZh = zh;
                    input = input.replace(pattern, "");
                    break;
                }
            }

            /* ---------- 3. 段 ---------- */
            let sect = "";
            input = input.replace(/Sec\.?\s*(\d+)/i, (_, n) => {
                const cNum = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][+n] || n;
                sect = cNum + "段";
                return "";
            });

            /* ---------- 4. 號 / 巷弄 / 樓室 ---------- */
            input = input.replace(/,/g, " ");
            let door = "", lane = "", alley = "", floor = "", room = "";
            input = input.replace(/No\.?\s*(\d+)/i, (_, n) => (door = n + "號", ""));
            input = input.replace(/Ln\.?\s*(\d+)/i, (_, n) => (lane = n + "巷", ""));
            input = input.replace(/Aly\.?\s*(\d+)/i, (_, n) => (alley = n + "弄", ""));
            input = input.replace(/(\d+)F/i, (_, n) => (floor = n + "樓", ""));
            input = input.replace(/Rm\.?\s*(\d+)/i, (_, n) => (room = n + "室", ""));

            /* ---------- 5. 組回中文 ---------- */
            const result = countyZh + streetZh + sect + lane + alley + door + floor + room;
            document.getElementById("chineseAddress").value = result || "（無法解析）";
        }

        /* --- Copy to clipboard：複製「中文地址」 --- */
        document.getElementById('copyBtn').addEventListener('click', () => {
            const addr = document.getElementById('chineseAddress').value.trim();   // ← 換這裡
            if (!addr) {
                showToast('請先輸入英文地址並完成轉換', 'secondary');
                return;
            }

            navigator.clipboard.writeText(addr)
                .then(() => showToast('已複製到剪貼簿！', 'secondary'))
                .catch(() => showToast('複製失敗，請檢查瀏覽器權限', 'danger'));
        });

        /* --- Open Google Maps：帶「中文地址」搜尋 --- */
        document.getElementById('mapBtn').addEventListener('click', () => {
            const addr = document.getElementById('chineseAddress').value.trim();   // ← 換這裡
            if (!addr) {
                showToast('請先輸入英文地址並完成轉換', 'secondary');
                return;
            }

            // Google Maps 對中文也能直接定位（不加 Taiwan 亦可）
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            window.open(url, '_blank');
            showToast('已在新分頁開啟 Google Maps', 'secondary');
        });

        /* --- 共用：Bootstrap Toast 工具函式 ------------------ */
        function showToast(message, variant = 'success') {
            // variant 可帶 'success' | 'danger' | 'warning' | 'info'
            const toastElement = document.getElementById('liveToast');
            const toastBody = document.getElementById('toastBody');

            // 更新文字
            toastBody.textContent = message;

            // 依 variant 換背景色
            toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
            toastElement.classList.add(`bg-${variant}`);

            // 建立 (或取得已存在的) Toast 實例並顯示
            const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
            toast.show();
        }