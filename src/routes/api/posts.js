const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const auth = require('../../middleware/auth');
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Post = require('../../models/Post');

/**
 * @route   POST api/posts
 * @desc    Create a post
 * @access  Private
 */
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      await newPost.save();

      res.json(newPost);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

/**
 * @route   GET api/posts
 * @desc    Get all posts
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find({}).sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/posts/:post_id
 * @desc    Get post by ID
 * @access  Private
 */
router.get('/:post_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });
    res.status(500).send('Server Error');
  }
});

/**
 * @route   DELETE api/posts/:post_id
 * @desc    Delete a post
 * @access  Private
 */
router.delete('/:post_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    await post.remove();
    res.json({ msg: 'Post removed', post });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT api/posts/:post_id
 * @desc    Update a post
 * @access  Private
 */
router.put(
  '/:post_id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const post = await Post.findById(req.params.post_id);
      if (!post) return res.status(404).json({ msg: 'Post not found' });
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      post.text = req.body.text;
      await post.save();
      res.json({ msg: 'Post updated', post });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId')
        return res.status(404).json({ msg: 'Post not found' });
      res.status(500).send('Server Error');
    }
  }
);

/**
 * @route   PUT api/posts/:post_id/like
 * @desc    Like a post
 * @access  Private
 */
router.put('/:post_id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    // Check if the post has already been liked
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: 'Post already liked' });
    }
    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT api/posts/:post_id/unlike
 * @desc    Unlike a post
 * @access  Private
 */
router.put('/:post_id/unlike', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    // Check if the post has not been liked
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);
    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST api/posts/:post_id/comments
 * @desc    Comment on a post
 * @access  Private
 */
router.post(
  '/:post_id/comments',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.post_id);
      if (!post) return res.status(404).json({ msg: 'Post not found' });

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId')
        return res.status(404).json({ msg: 'Post not found' });
      res.status(500).send('Server Error');
    }
  }
);

/**
 * @route   PUT api/posts/:post_id/comments/:comment_id
 * @desc    Update a comment
 * @access  Private
 */
router.put(
  '/:post_id/comments/:comment_id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const post = await Post.findById(req.params.post_id);
      if (!post) return res.status(404).json({ msg: 'Post not found' });

      const newCommentArray = await post.comments.map((comment) => {
        if (comment.id.toString() === req.params.comment_id) {
          if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
          } else {
            comment.text = req.body.text;
          }
        }
        return comment;
      });

      post.comments = newCommentArray;
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId')
        return res.status(404).json({ msg: 'Post not found' });
      res.status(500).send('Server Error');
    }
  }
);

/**
 * @route   DELETE api/posts/:post_id/comments/:comment_id
 * @desc    Delete a comment
 * @access  Private
 */
router.delete('/:post_id/comments/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const newCommentArray = await post.comments.filter((comment) => {
      if (comment.id.toString() === req.params.comment_id) {
        if (comment.user.toString() !== req.user.id) {
          return res.status(401).json({ msg: 'User not authorized' });
        } else {
          return false;
        }
      }
      return true;
    });

    post.comments = newCommentArray;
    await post.save();
    res.json(post.comments);

    /*
      // Pull out comment
      const comment = post.comments.find(
        (comment) => comment.id === req.params.comment_id
      );
      // Make sure comment exists
      if (!comment)
        return res.status(404).json({ msg: 'Comment does not exist' });

      // Check user
      if (comment.user.toString() !== req.user.id)
        return res.status(401).json({ msg: 'User not authorized' });

      // Get remove index
      const removeIndex = post.comments
        .map((comment) => comment.user.toString())
        .indexOf(req.user.id);
      post.comments.splice(removeIndex, 1);
      await post.save();
      res.json(post.comments);
    */
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });
    res.status(500).send('Server Error');
  }
});

module.exports = router;
