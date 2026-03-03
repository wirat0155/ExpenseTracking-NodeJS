/**
 * components.js — Utility to load HTML components like Topbar
 */

window.Components = {
    load: async (targetId, componentPath) => {
        try {
            const res = await fetch(componentPath);
            if (!res.ok) throw new Error(`Failed to load component: ${componentPath}`);
            const html = await res.text();
            const container = document.getElementById(targetId);
            if (container) {
                container.innerHTML = html;

                // Execute scripts manually since innerHTML won't run them
                const scripts = container.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            }
        } catch (err) {
            console.error(err);
        }
    }
};
