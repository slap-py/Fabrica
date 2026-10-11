"""Conservative source-patch validation: proximity alone is not anatomy evidence."""
import re
REFERENCES = [
 'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/',
 'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/',
]
# Bone families only, not attachment extent or an exhaustive origin/insertion account.
VERTEBRA = r'(?:atlas-c1|axis-c2|.*vertebra.*)'
RULES = {
 'biceps-brachii': ('scapula', 'radius'),
 'brachialis': ('humerus', 'ulna'),
 'brachioradialis': ('humerus', 'radius'),
 'coracobrachialis': ('scapula', 'humerus'),
 'deltoid': ('(?:clavicle|scapula)', 'humerus'),
 'infraspinatus': ('scapula', 'humerus'),
 'supraspinatus': ('scapula', 'humerus'),
 'subscapularis': ('scapula', 'humerus'),
 'teres-minor': ('scapula', 'humerus'),
 'teres-major': ('scapula', 'humerus'),
 'latissimus-dorsi': (r'(?:'+VERTEBRA+r'|sacrum|hip-bone|.*rib.*|scapula)', 'humerus'),
 'levator-scapulae': (VERTEBRA, 'scapula'),
 'rhomboid': (VERTEBRA, 'scapula'),
 'trapezius': (r'(?:'+VERTEBRA+r'|occipital-bone)', '(?:clavicle|scapula)'),
 'serratus-posterior': (VERTEBRA, r'.*rib.*'),
 'interspinales': (VERTEBRA, VERTEBRA),
 'intertransversarii': (VERTEBRA, VERTEBRA),
 'rotatores': (VERTEBRA, VERTEBRA),
 'multifidus': (r'(?:'+VERTEBRA+r'|sacrum)', VERTEBRA),
}
def validate_attachments(record, candidates):
 accepted, rejected = [], []
 rule = next((v for k,v in RULES.items() if k in record['id']), None)
 for patch in candidates:
  expected = rule[0 if patch['end']=='from' else 1] if rule else None
  compatible = expected and re.fullmatch(expected+r'(?:-[lr])?', patch['hostId'])
  correct_side = not patch['hostId'].endswith(('-l','-r')) or patch['hostId'].endswith('-'+record['laterality'][0])
  if compatible and correct_side and patch['hostDistanceMm'] <= 25:
   accepted.append({**patch, 'hostValidation':'reference-supported-bone-family', 'referenceUrls':REFERENCES})
  else:
   rejected.append({**patch, 'reason':'No reviewed muscle rule' if not rule else 'Candidate bone is incompatible with the reviewed attachment family or laterality'})
 return accepted, rejected
