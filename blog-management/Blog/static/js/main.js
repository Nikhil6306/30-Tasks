document.addEventListener('DOMContentLoaded', () => {
    const postsList = document.getElementById('postsList');
    const postModal = document.getElementById('postModal');
    const postForm = document.getElementById('postForm');
    const newPostBtn = document.getElementById('newPostBtn');
    const closeBtns = document.querySelectorAll('.close-btn');
    const modalTitle = document.getElementById('modalTitle');
    const notification = document.getElementById('notification');

    let currentEditingId = null;

    // Fetch and display posts
    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            renderPosts(posts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            showNotification('Failed to load posts', 'error');
        }
    };

    const renderPosts = (posts) => {
        if (posts.length === 0) {
            postsList.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--border-color); margin-bottom: 1rem; display: block;"></i>
                    <p>No posts found. Create your first blog post!</p>
                </div>
            `;
            return;
        }

        postsList.innerHTML = posts.map(post => `
            <div class="post-card" data-id="${post._id}">
                <div class="post-content-area">
                    <h3>${post.title}</h3>
                    <p class="post-content">${post.content}</p>
                </div>
                <div class="post-footer">
                    <span class="author">By ${post.author}</span>
                    <div class="post-actions">
                        <button class="action-btn edit-btn" onclick="openEditModal('${post._id}', '${post.title}', '${post.author}', \`${post.content.replace(/`/g, '\\`')}\`)">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deletePost('${post._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Modal logic
    newPostBtn.addEventListener('click', () => {
        currentEditingId = null;
        modalTitle.textContent = 'Create New Post';
        postForm.reset();
        postModal.style.display = 'flex';
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            postModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === postModal) {
            postModal.style.display = 'none';
        }
    });

    // Handle form submission
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postData = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            content: document.getElementById('content').value
        };

        try {
            let response;
            if (currentEditingId) {
                // Update
                response = await fetch(`/api/posts/${currentEditingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
            } else {
                // Create
                response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
            }

            if (response.ok) {
                showNotification(currentEditingId ? 'Post updated successfully' : 'Post created successfully');
                postModal.style.display = 'none';
                fetchPosts();
            } else {
                const err = await response.json();
                showNotification(err.error || 'Something went wrong', 'error');
            }
        } catch (error) {
            console.error('Error saving post:', error);
            showNotification('Failed to save post', 'error');
        }
    });

    // Global helper functions
    window.openEditModal = (id, title, author, content) => {
        currentEditingId = id;
        modalTitle.textContent = 'Edit Post';
        document.getElementById('title').value = title;
        document.getElementById('author').value = author;
        document.getElementById('content').value = content;
        postModal.style.display = 'flex';
    };

    window.deletePost = async (id) => {
        if (confirm('Are you sure you want to delete this post?')) {
            try {
                const response = await fetch(`/api/posts/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showNotification('Post deleted successfully');
                    fetchPosts();
                } else {
                    showNotification('Failed to delete post', 'error');
                }
            } catch (error) {
                console.error('Error deleting post:', error);
                showNotification('Error deleting post', 'error');
            }
        }
    };

    // Notifications
    const showNotification = (message, type = 'success') => {
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        notification.style.background = type === 'success' ? '#1e293b' : '#ef4444';
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    // Initial load
    fetchPosts();
});
