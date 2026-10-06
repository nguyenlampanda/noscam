<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityFeedback extends Model
{
    protected $table = 'community_feedbacks';

    public const TYPES = [
        'positive',
        'caution',
        'unclear',
        'consider',
    ];

    protected $fillable = [
        'entity_type',
        'normalized_value',
        'feedback_type',
        'source_hash',
    ];
}
