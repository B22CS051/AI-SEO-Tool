import React, { useState } from 'react';
import { Aperture, Clipboard, ClipboardCheck, ExternalLink, Rss, PenSquare } from 'lucide-react';

// --- HELPER COMPONENTS ---

const LoadingSpinner = () => (
  <div className="flex items-center justify-center space-x-2">
    <Aperture className="h-5 w-5 animate-spin text-indigo-500" />
    <span className="text-gray-500">Generating...</span>
  </div>
);

const SectionCard = ({ number, title, children }) => (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200/80 p-6 mb-6 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                {number}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 ml-4">{title}</h2>
        </div>
        <div className="pl-14">
            {children}
        </div>
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  // --- STATE MANAGEMENT ---
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [blogPost, setBlogPost] = useState(null);
  
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  const [copiedStates, setCopiedStates] = useState({
    title: false,
    body: false,
  });

  // --- API CALL FUNCTION ---
  const callGeminiAPI = async (payload) => {
    // Note: The API key is left empty as the environment will provide it.
    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "An unknown API error occurred.");
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          return result.candidates[0].content.parts[0].text;
        } else {
          console.error("Unexpected API response structure:", result);
          if (result.candidates?.[0]?.finishReason === 'SAFETY') {
             throw new Error("Content generation was blocked due to safety policies. Please try a different product or prompt.");
          }
          throw new Error("Failed to generate content. The API returned an empty or invalid response.");
        }
    } catch (e) {
        console.error("API call failed:", e);
        throw e;
    }
  };

  // --- HANDLER FUNCTIONS ---
  const handleGenerateKeywords = async () => {
    if (!productName) {
        setError("Please enter a product name first.");
        return;
    };
    setIsLoadingKeywords(true);
    setKeywords([]);
    setBlogPost(null); // Reset blog post when generating new keywords
    setError(null);

    const prompt = `Generate exactly 4 high-intent, long-tail SEO keywords for a blog post about a "${productName}". Optional product description: "${productDescription}". The keywords should be suitable for attracting customers looking to buy. Return the keywords as a JSON array of strings. For example: ["keyword 1", "keyword 2", "best keyword 3", "keyword 4 review"]`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
          responseMimeType: "application/json",
      }
    };

    try {
        const responseText = await callGeminiAPI(payload);
        const parsedKeywords = JSON.parse(responseText);
        setKeywords(parsedKeywords);
    } catch (e) {
        setError(`Failed to generate keywords: ${e.message}`);
    } finally {
        setIsLoadingKeywords(false);
    }
  };

  const handleCreateContent = async () => {
    if (keywords.length === 0) {
      setError("Please generate keywords before creating content.");
      return;
    }
    setIsLoadingContent(true);
    setBlogPost(null);
    setError(null);

    const prompt = `Write an engaging and SEO-optimized blog post of about 150-200 words for the product: "${productName}". Optional product description: "${productDescription}". Naturally incorporate the following keywords throughout the text: ${keywords.join(', ')}. The tone should be enthusiastic and persuasive, aimed at encouraging a purchase. Return the result as a single JSON object with two keys: "title" (a catchy, SEO-friendly title) and "body" (the blog post content as a string with paragraphs separated by '\\n\\n').`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "title": { "type": "STRING" },
                    "body": { "type": "STRING" }
                },
                required: ["title", "body"]
            }
        }
    };

    try {
        const responseText = await callGeminiAPI(payload);
        const parsedPost = JSON.parse(responseText);
        setBlogPost(parsedPost);
    } catch (e) {
        setError(`Failed to create blog content: ${e.message}`);
    } finally {
        setIsLoadingContent(false);
    }
  };

  const handleCopy = (text, type) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        setCopiedStates(prev => ({ ...prev, [type]: true }));
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };
  
  // --- RENDER ---
  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-700 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 tracking-tight">AI SEO Blog Generator</h1>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">Create compelling, keyword-rich blog posts for any product in just a few clicks.</p>
        </header>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg" role="alert">
                <p className="font-bold">An Error Occurred</p>
                <p>{error}</p>
            </div>
        )}

        {/* --- STEP 1: PRODUCT INPUT --- */}
        <SectionCard number="1" title="Enter Product Details">
          <p className="text-gray-600 mb-4">Manually enter a product name and an optional description. The more detail you provide, the better the AI results.</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Sony WH-1000XM5 Wireless Headphones"
                className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-1">Product Description (Optional)</label>
              <textarea
                id="productDescription"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows="3"
                placeholder="e.g., Industry-leading noise canceling with two processors, Auto NC Optimizer, and a lightweight design."
                className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </SectionCard>

        {/* --- STEP 2: KEYWORD RESEARCH --- */}
        <SectionCard number="2" title="Generate SEO Keywords">
            <p className="text-gray-600 mb-4">Our AI will research and generate high-intent keywords based on your product details.</p>
            <button
                onClick={handleGenerateKeywords}
                disabled={isLoadingKeywords || !productName}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
                {isLoadingKeywords ? <LoadingSpinner /> : 'Generate Keywords'}
            </button>
            
            {keywords.length > 0 && (
                <div className="mt-5">
                    <h3 className="font-semibold text-gray-700 mb-3">Generated Keywords:</h3>
                    <div className="flex flex-wrap gap-2">
                        {keywords.map((kw, index) => (
                            <span key={index} className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1.5 rounded-full">
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </SectionCard>

        {/* --- STEP 3: CONTENT CREATION --- */}
        <SectionCard number="3" title="Create Blog Post">
            <p className="text-gray-600 mb-4">Now, let's generate the blog post. The AI will write a 150-200 word article incorporating your keywords.</p>
             <button
                onClick={handleCreateContent}
                disabled={isLoadingContent || keywords.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
                {isLoadingContent ? <LoadingSpinner /> : 'Create Blog Content'}
            </button>

            {blogPost && (
                <div className="mt-5 p-5 bg-white rounded-lg border border-gray-200/80 prose prose-indigo max-w-none">
                    <h3 className="font-bold text-2xl !mb-2 text-gray-900">{blogPost.title}</h3>
                    <div className="flex gap-4">
                        <button onClick={() => handleCopy(blogPost.title, 'title')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5">
                            {copiedStates.title ? <ClipboardCheck size={16}/> : <Clipboard size={16} />}
                            {copiedStates.title ? 'Copied Title!' : 'Copy Title'}
                        </button>
                        <button onClick={() => handleCopy(blogPost.body, 'body')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5">
                            {copiedStates.body ? <ClipboardCheck size={16}/> : <Clipboard size={16} />}
                            {copiedStates.body ? 'Copied Body!' : 'Copy Body'}
                        </button>
                    </div>
                    <hr className="my-4" />
                    {blogPost.body.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="text-gray-700">{paragraph}</p>
                    ))}
                </div>
            )}
        </SectionCard>

        {/* --- STEP 4: PUBLISH --- */}
        <SectionCard number="4" title="Publish Your Article">
            <p className="text-gray-600 mb-4">Your content is ready! Copy the title and body above, then use the links below to post it on your favorite platform.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <a href="https://wordpress.com/post" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-500 hover:shadow-md transition-all">
                    <Rss className="text-blue-500" size={20} /> <span className="font-semibold text-gray-700">Post on WordPress</span><ExternalLink size={16} className="text-gray-400"/>
                </a>
                <a href="https://medium.com/new-story" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-black hover:shadow-md transition-all">
                    <PenSquare className="text-black" size={20} /> <span className="font-semibold text-gray-700">Post on Medium</span><ExternalLink size={16} className="text-gray-400"/>
                </a>
                 <a href="https://www.blogger.com/blog/post/edit/new" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-orange-500 hover:shadow-md transition-all">
                    <svg className="h-5 w-5 text-orange-500" viewBox="0 0 496 512" fill="currentColor"><path d="M496 256c0 137-111 248-248 248-25.6 0-50.2-3.9-73.4-11.1-23.2-7.2-24.4-36.6-2.6-45.8 45.4-19.2 82.2-54.2 103.6-96.2 3.6-7.2 13.8-7.2 17.4 0 25.2 50.4 20.4 111.6-12 153.6-32.4 42-88.8 63.6-141.6 63.6-114.6 0-208-93.4-208-208 0-114.6 93.4-208 208-208s208 93.4 208 208zm-153.4-48.6C342.6 157 307.3 128 256 128c-51.3 0-86.6 29-86.6 79.4 0 47.4 32.4 81.4 86.6 81.4 51.3 0 86.6-34 86.6-81.4zM256 240c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"></path></svg>
                    <span className="font-semibold text-gray-700">Post on Blogger</span><ExternalLink size={16} className="text-gray-400"/>
                </a>
            </div>
        </SectionCard>

        <footer className="text-center mt-10 text-gray-400 text-sm">
            <p>Powered by Google Gemini. Developed for Netlify deployment.</p>
        </footer>
      </div>
    </div>
  );
}
