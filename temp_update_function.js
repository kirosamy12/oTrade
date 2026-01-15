    // Fetch updated translations
    const updatedTranslations = await getTranslationsByEntity('testimonial', testimonial._id);
    
    // Create response with all required fields
    const response = formatAdminResponse(testimonial, updatedTranslations);
    
    // Ensure image is included in response (should be handled by formatAdminResponse)
    console.log('=== UPDATE RESPONSE DEBUG ===');
    console.log('Response image:', response.image);
    console.log('Response structure:', JSON.stringify(response, null, 2));

    res.status(200).json({
      message: 'Testimonial updated successfully',
      testimonial: response
    });
