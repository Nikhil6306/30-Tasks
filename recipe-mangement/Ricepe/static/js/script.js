document.addEventListener('DOMContentLoaded', () => {
    const recipeGrid = document.getElementById('recipeGrid');
    const emptyState = document.getElementById('emptyState');
    const recipeModal = document.getElementById('recipeModal');
    const addRecipeBtn = document.getElementById('addRecipeBtn');
    const recipeForm = document.getElementById('recipeForm');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const recipeSearch = document.getElementById('recipeSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const loader = document.querySelector('.loader-wrapper');

    let allRecipes = [];
    let currentCategory = 'all';

    // Hide loader
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 800);
    });

    // Fetch recipes
    async function fetchRecipes() {
        try {
            const response = await fetch('/api/recipes');
            allRecipes = await response.json();
            renderRecipes();
        } catch (error) {
            console.error('Error fetching recipes:', error);
            showNotification('Failed to load recipes', 'error');
        }
    }

    // Render recipes
    function renderRecipes() {
        const filtered = allRecipes.filter(recipe => {
            const matchesSearch = recipe.title.toLowerCase().includes(recipeSearch.value.toLowerCase()) ||
                                recipe.category.toLowerCase().includes(recipeSearch.value.toLowerCase());
            const matchesCategory = currentCategory === 'all' || recipe.category === currentCategory;
            return matchesSearch && matchesCategory;
        });

        recipeGrid.innerHTML = '';
        
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(recipe => {
                const card = document.createElement('div');
                card.className = 'recipe-card';
                card.innerHTML = `
                    <div class="card-image">
                        <img src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="${recipe.title}">
                        <span class="category-tag">${recipe.category}</span>
                    </div>
                    <div class="card-content">
                        <h3>${recipe.title}</h3>
                        <div class="prep-time">
                            <i class="far fa-clock"></i> ${recipe.prep_time}
                        </div>
                        <div class="card-actions">
                            <button class="action-btn edit-btn" onclick="openEditModal('${recipe._id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteRecipe('${recipe._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                recipeGrid.appendChild(card);
            });
        }
    }

    // Modal controls
    addRecipeBtn.addEventListener('click', () => {
        recipeForm.reset();
        document.getElementById('recipeId').value = '';
        modalTitle.textContent = 'Add New Recipe';
        recipeModal.style.display = 'flex';
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            recipeModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === recipeModal) recipeModal.style.display = 'none';
    });

    // Handle Form Submission
    recipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recipeId = document.getElementById('recipeId').value;
        const recipeData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            prep_time: document.getElementById('prepTime').value,
            ingredients: document.getElementById('ingredients').value.split('\n').filter(i => i.trim() !== ''),
            steps: document.getElementById('steps').value.split('\n').filter(s => s.trim() !== '')
        };

        const method = recipeId ? 'PUT' : 'POST';
        const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipeData)
            });

            if (response.ok) {
                recipeModal.style.display = 'none';
                fetchRecipes();
                showNotification(recipeId ? 'Recipe updated!' : 'Recipe added!', 'success');
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            showNotification('Error saving recipe', 'error');
        }
    });

    // Global Action Functions
    window.openEditModal = (id) => {
        const recipe = allRecipes.find(r => r._id === id);
        if (!recipe) return;

        document.getElementById('recipeId').value = recipe._id;
        document.getElementById('title').value = recipe.title;
        document.getElementById('category').value = recipe.category;
        document.getElementById('prepTime').value = recipe.prep_time;
        document.getElementById('ingredients').value = Array.isArray(recipe.ingredients) ? recipe.ingredients.join('\n') : recipe.ingredients;
        document.getElementById('steps').value = Array.isArray(recipe.steps) ? recipe.steps.join('\n') : recipe.steps;

        modalTitle.textContent = 'Edit Recipe';
        recipeModal.style.display = 'flex';
    };

    window.deleteRecipe = async (id) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        try {
            const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchRecipes();
                showNotification('Recipe deleted!', 'success');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            showNotification('Error deleting recipe', 'error');
        }
    };

    // Search and Filter
    recipeSearch.addEventListener('input', renderRecipes);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderRecipes();
        });
    });

    // Notifications
    function showNotification(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 100);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add CSS for toast
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 3000;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
        }
        .toast.success { background: #2ecc71; }
        .toast.error { background: #e74c3c; }
    `;
    document.head.appendChild(style);

    // Initial load
    fetchRecipes();
});
