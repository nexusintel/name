import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
};

const formatPostForClient = (post) => {
    if (!post) return null;
    const { _id, ...rest } = post;
    return {
        _id: _id.toHexString(),
        ...rest
    };
};

export const createPost = async (req, res, next) => {
    try {
        const { title, content, featureImageUrl, status } = req.body;
        if (!title || !content || !featureImageUrl || !status) {
            return next(new AppError('Title, content, feature image, and status are required.', 400));
        }

        const db = getDb();
        const slug = generateSlug(title);

        const newPost = {
            title,
            slug,
            content,
            featureImageUrl,
            status,
            authorId: req.user._id.toHexString(),
            authorName: req.user.fullName || req.user.email,
            createdAt: new Date().toISOString(),
            publishedAt: status === 'published' ? new Date().toISOString() : null,
        };

        const result = await db.collection('blog_posts').insertOne(newPost);
        const createdPost = { ...newPost, _id: result.insertedId };
        
        res.status(201).json(formatPostForClient(createdPost));
    } catch (error) {
        next(new AppError('Failed to create blog post.', 500));
    }
};

export const getPublishedPosts = async (req, res, next) => {
    try {
        const db = getDb();
        const posts = await db.collection('blog_posts')
            .find({ status: 'published' })
            .sort({ publishedAt: -1 })
            .toArray();
        res.status(200).json(posts.map(formatPostForClient));
    } catch (error) {
        next(new AppError('Failed to fetch published posts.', 500));
    }
};
export const updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, featureImageUrl, status } = req.body;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid post ID.', 400));
        }

        const db = getDb();
        const updatedFields = { title, content, featureImageUrl, status };
        if (title) {
            updatedFields.slug = generateSlug(title);
        }
        if (status === 'published') {
            updatedFields.publishedAt = new Date().toISOString();
        }

        const result = await db.collection('blog_posts').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Blog post not found.', 404));
        }

        const updatedPost = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });
        res.status(200).json(formatPostForClient(updatedPost));
    } catch (error) {
        next(new AppError('Failed to update blog post.', 500));
    }
};

export const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid post ID.', 400));
        }

        const db = getDb();
        const result = await db.collection('blog_posts').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return next(new AppError('Blog post not found.', 404));
        }

        res.status(200).json({ message: 'Blog post deleted successfully.' });
    } catch (error) {
        next(new AppError('Failed to delete blog post.', 500));
    }
};

export const getAllPostsAdmin = async (req, res, next) => {
    try {
        const db = getDb();
        const posts = await db.collection('blog_posts')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        res.status(200).json(posts.map(formatPostForClient));
    } catch (error) {
        next(new AppError('Failed to fetch all blog posts.', 500));
    }
};

export const getPostBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const db = getDb();
        const post = await db.collection('blog_posts').findOne({ slug });

        if (!post) {
            return next(new AppError('Blog post not found.', 404));
        }

        res.status(200).json(formatPostForClient(post));
    } catch (error) {
        next(new AppError('Failed to fetch blog post.', 500));
    }
};