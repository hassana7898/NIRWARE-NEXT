import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';

export interface SignatureVector {
  strokes: Array<Array<{ x: number; y: number }>>;
  actor: string;
  timestamp: string;
  deliveryId: string;
}

interface SignaturePadProps {
  actorName: string;
  deliveryId: string;
  onSave: (signaturePayload: string) => void;
  onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  actorName,
  deliveryId,
  onSave,
  onCancel,
}) => {
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [allStrokes, setAllStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (currentStroke.length > 0) {
        setAllStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke([]);
      }
    },
  });

  const handleClear = () => {
    setAllStrokes([]);
    setCurrentStroke([]);
  };

  const handleConfirm = () => {
    const payload: SignatureVector = {
      strokes: allStrokes,
      actor: actorName,
      timestamp: new Date().toISOString(),
      deliveryId,
    };
    // Encodes real touch vector signature data
    onSave(JSON.stringify(payload));
  };

  const hasDrawn = allStrokes.length > 0 || currentStroke.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>امضای دیجیتال تحویل‌گیرنده در محل مزرعه</Text>
      <Text style={styles.subtitle}>
        امضاکننده: <Text style={styles.bold}>{actorName}</Text> (مهر و تایید تخلیه دان)
      </Text>

      {/* Signature Canvas Box */}
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <View style={styles.canvasNotice}>
          <Text style={styles.watermarkText}>
            {hasDrawn ? 'امضا ثبت شد' : 'لطفاً امضای خود را با انگشت در این کادر رسم کنید'}
          </Text>
        </View>
        {/* Visual point indicator */}
        {hasDrawn && (
          <View style={styles.signatureIndicator}>
            <Text style={styles.indicatorText}>
              ✓ بردار اثر انگشت ({allStrokes.length} حرکت قلم ثبت شد)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.confirmBtn, !hasDrawn && styles.disabledBtn]}
          disabled={!hasDrawn}
          onPress={handleConfirm}
        >
          <Text style={styles.btnText}>تأیید و ذخیره امضا</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.clearBtn]} onPress={handleClear}>
          <Text style={[styles.btnText, { color: '#475569' }]}>پاک کردن</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
          <Text style={[styles.btnText, { color: '#dc2626' }]}>انصراف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    width: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: '#047857',
  },
  canvasContainer: {
    height: 180,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasNotice: {
    position: 'absolute',
    opacity: 0.6,
  },
  watermarkText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  signatureIndicator: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  indicatorText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: '#059669',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  clearBtn: {
    backgroundColor: '#f1f5f9',
  },
  cancelBtn: {
    backgroundColor: '#fee2e2',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
