import Partner from './partner.model.js';
import { uploadImage } from '../../utils/cloudinary.js'; // Assuming cloudinary utility exists
import mongoose from 'mongoose';

/**
 * Create a new partner
 * POST /api/v1/partners
 */
export const createPartner = async (req, res) => {
  try {
    console.log('=== CREATE PARTNER DEBUG ===');
    console.log('Request Body:', req.body);
    console.log('Files:', req.files);

    let logo;

    // Handle logo upload
    if (req.files?.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];
      logo = await uploadImage(logoFile, 'partners');
    } else if (req.body.logo?.startsWith('data:image')) {
      logo = await uploadImage(req.body.logo, 'partners');
    } else {
      logo = req.body.logo;
    }

    if (!logo) {
      return res.status(400).json({
        success: false,
        message: 'Logo is required.'
      });
    }

    const { name, websiteUrl, isPremium } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.'
      });
    }

    // Validate URL if provided
    if (websiteUrl && websiteUrl.trim()) {
      const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
      if (!urlRegex.test(websiteUrl.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Website URL is not valid.'
        });
      }
    }

    const partner = new Partner({
      logo,
      name: name.trim(),
      websiteUrl: websiteUrl?.trim(),
      isPremium: isPremium === 'true' || isPremium === true || isPremium === '1'
    });

    await partner.save();

    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partner
    });

  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all partners
 * GET /api/v1/partners
 */
export const getAllPartners = async (req, res) => {
  try {
    const { isPremium } = req.query;

    let filter = {};

    // Apply isPremium filter if provided
    if (isPremium !== undefined) {
      filter.isPremium = isPremium === 'true' || isPremium === true || isPremium === '1';
    }

    const partners = await Partner.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Partners retrieved successfully',
      data: {
        partners,
        count: partners.length
      }
    });

  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get partner by ID
 * GET /api/v1/partners/:id
 */
export const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid partner ID.'
      });
    }

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Partner retrieved successfully',
      data: partner
    });

  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update partner
 * PATCH /api/v1/partners/:id
 */
export const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid partner ID.'
      });
    }

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found.'
      });
    }

    let logo = partner.logo; // Keep existing logo if not updated

    // Handle logo update if provided
    if (req.files?.logo && req.files.logo[0]) {
      const logoFile = req.files.logo[0];
      logo = await uploadImage(logoFile, 'partners');
    } else if (req.body.logo?.startsWith('data:image')) {
      logo = await uploadImage(req.body.logo, 'partners');
    } else if (req.body.logo !== undefined) {
      logo = req.body.logo;
    }

    const updateData = {};

    // Update fields if provided
    if (req.body.name !== undefined) {
      if (!req.body.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required.'
        });
      }
      updateData.name = req.body.name.trim();
    }

    if (req.body.websiteUrl !== undefined) {
      if (req.body.websiteUrl && req.body.websiteUrl.trim()) {
        const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
        if (!urlRegex.test(req.body.websiteUrl.trim())) {
          return res.status(400).json({
            success: false,
            message: 'Website URL is not valid.'
          });
        }
      }
      updateData.websiteUrl = req.body.websiteUrl?.trim();
    }

    if (req.body.isPremium !== undefined) {
      updateData.isPremium = req.body.isPremium === 'true' || req.body.isPremium === true || req.body.isPremium === '1';
    }

    if (logo) {
      updateData.logo = logo;
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Partner updated successfully',
      data: updatedPartner
    });

  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete partner
 * DELETE /api/v1/partners/:id
 */
export const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid partner ID.'
      });
    }

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found.'
      });
    }

    await Partner.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Partner deleted successfully',
      data: null
    });

  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};