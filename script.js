

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const toneBtns = document.querySelectorAll('.toggle-btn');
    const resultsContainer = document.getElementById('results-container');
    
    // Add an error container before results
    const errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.style.display = 'none';
    resultsContainer.parentNode.insertBefore(errorContainer, resultsContainer);
    
    const template = document.getElementById('idea-card-template');
    
    let currentTone = 'casual';

    toneBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toneBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTone = e.target.dataset.tone;
        });
    });

    const getFormData = () => {
        return {
            platform: document.getElementById('platform').value,
            goal: document.getElementById('goal').value,
            niche: document.getElementById('niche').value || 'Content Creator',
            audience: document.getElementById('audience').value || 'General Audience',
            tone: currentTone,
            vibe: document.getElementById('user-vibe').value || ''
        };
    };

    const systemPrompt = `You are a brutally honest content strategist who has studied what actually performs on social media in 2026. You write for real people building personal brands — not corporations, not coaches, not hustle-culture accounts. You know the difference between content that gets saved and content that gets scrolled past. STRICT RULES — never use: journey, excited, passionate, game-changer, leverage, delighted, thrilled, in today's world, ever-evolving, em dashes, 'here are X things', bullet points in captions, question hooks, 'how I' hooks. No motivational poster energy. No corporate tone. Write like a specific human, not a template.`;

    const generatePrompt = (data) => {
        const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        return `${systemPrompt}\n\nToday's date is ${currentDate}. Before generating ideas, internally analyse:\n- What content formats and topics are currently performing well on ${data.platform} this month\n- What conversations, trends, or pain points are relevant to the ${data.niche} space right now in ${currentDate}\n- What angles feel fresh vs overdone in ${currentDate} for ${data.audience}\nUse this analysis silently to inform the ideas — do not mention the analysis in your output.\n\nNow generate exactly 5 post ideas for this creator:\nPlatform: ${data.platform}\nNiche: ${data.niche}\nTarget Audience: ${data.audience}\nGoal: ${data.goal}\nTone: ${data.tone}\n${data.vibe ? `Their content vibe: ${data.vibe}` : ''}\n\nPlatform format rules — strictly follow:\n- LinkedIn: [text post, carousel, article]\n- Instagram: [reel, carousel, static post]\n- Twitter/X: [thread, single tweet]\n- YouTube: [short, long-form video, community post]\n- TikTok: [reel, stitch, duet]\n\nFor each idea:\n- hook: max 10 words. Must create instant tension or curiosity. Unexpected angle. No questions. No 'how I'.\n- caption: 3-4 lines. Start mid-story or mid-thought. Conversational. Specific. If vibe is provided, match it hard.\n- hashtags: 5 hashtags — niche-specific + broad reach mix. No #motivation #success #hustle #life.\n- format: must match platform rules above.\n\nMake at least 3 of the 5 ideas feel like they could only be written for this exact niche + audience combo — not interchangeable with any other creator.\n\nReturn clean JSON array only. No markdown. No backticks. No extra text outside the array.`;
    };



    const callBackend = async (prompt) => {
        errorContainer.style.display = 'none'; // reset on new call
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error("[API Call Failed]", err);
            errorContainer.innerHTML = `<strong>Error:</strong> ${err.message}`;
            errorContainer.style.display = 'block';
            return null;
        }
    };

    const renderCard = (idea, index, containerToReplace = null) => {
        const clone = template.content.cloneNode(true);
        const cardNode = clone.querySelector('.card');
        
        // Alternate slight rotation: odd cards rotate(-0.6deg), even cards rotate(0.5deg)
        cardNode.style.transform = index % 2 === 0 ? 'rotate(0.5deg)' : 'rotate(-0.6deg)';
        
        const badge = cardNode.querySelector('.format-badge');
        badge.textContent = idea.format;
        
        cardNode.querySelector('.hook-text').textContent = idea.hook;
        cardNode.querySelector('.caption-text').textContent = idea.caption;
        cardNode.querySelector('.hashtags-text').textContent = idea.hashtags;

        const copyBtn = cardNode.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const textToCopy = `${idea.hook}\n\n${idea.caption}\n\n${idea.hashtags}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'copied!';
                setTimeout(() => copyBtn.textContent = originalText, 1500);
            });
        });

        const redoBtn = cardNode.querySelector('.redo-btn');
        redoBtn.addEventListener('click', async () => {
            const overlay = cardNode.querySelector('.loading-overlay');
            overlay.style.display = 'flex';
            
            const formData = getFormData();
            const prompt = generatePrompt(formData);
            
            const res = await callBackend(prompt);
            
            if (res && res.length > 0) {
                resultsContainer.innerHTML = '';
                res.forEach((newIdea, idx) => {
                    renderCard(newIdea, idx);
                });
            } else {
                overlay.style.display = 'none';
            }
        });

        if (containerToReplace) {
            containerToReplace.replaceWith(cardNode);
        } else {
            resultsContainer.appendChild(cardNode);
        }
    };

    generateBtn.addEventListener('click', async () => {


        generateBtn.disabled = true;
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = 'cooking...';
        resultsContainer.innerHTML = '';

        const formData = getFormData();
        const prompt = generatePrompt(formData);

        const results = await callBackend(prompt);
        
        if (results && Array.isArray(results)) {
            results.forEach((idea, index) => {
                renderCard(idea, index);
            });
        }

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    });
});
