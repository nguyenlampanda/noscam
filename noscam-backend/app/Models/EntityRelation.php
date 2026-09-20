<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityRelation extends Model
{
    protected $fillable = [
        'entity_id',
        'related_entity_id',
        'relation_type',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(
            Entity::class,
            'entity_id'
        );
    }

    public function relatedEntity(): BelongsTo
    {
        return $this->belongsTo(
            Entity::class,
            'related_entity_id'
        );
    }
}